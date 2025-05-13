const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { db, jwtSecret } = require("./config");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const verifyUserToken = require("./middleware/userAuth");
const verifyAdminToken = require("./middleware/adminAuth");
const upload = require("./middleware/multerConfig");

// 登录频率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 最多5次尝试
  message: {
    code: 0,
    message: "尝试登录次数过多，请15分钟后再试",
    data: null,
  },
});

/**
 * 用户注册接口
 */
router.post("/users/register", upload.single("avatar"), async (req, res) => {
  const { username, password, nickname } = req.body;
  const avatarFile = req.file;

  if (!username || !password) {
    return res.status(400).json({
      code: 0,
      message: "用户名和密码不能为空",
      data: null,
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [checkResult] = await db
      .promise()
      .query("SELECT * FROM users WHERE username = ?", [username]);

    if (checkResult.length > 0) {
      return res.status(400).json({
        code: 0,
        message: "用户名已存在",
        data: null,
      });
    }

    const avatarUrl = avatarFile
      ? `/uploads/${avatarFile.filename}`
      : "/uploads/default.png";

    await db
      .promise()
      .query(
        "INSERT INTO users (username, password_hash, nickname, avatar_url) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, nickname, avatarUrl]
      );

    res.status(201).json({
      code: 1,
      message: "注册成功",
      data: null,
    });
  } catch (err) {
    console.error("注册出错:", err);
    res.status(500).json({
      code: 0,
      message: "注册失败，请稍后再试",
      data: null,
    });
  }
});

/**
 * 用户登录接口
 */
router.post("/users/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  // 判断输入是否为空
  if (!username || !password) {
    return res.status(400).json({
      code: 0,
      message: "用户名、密码不能为空",
      data: null,
    });
  }

  try {
    // 查询数据库中是否存在该用户名
    const checkSql = "SELECT * FROM users WHERE username = ?";
    const [results] = await db.promise().query(checkSql, [username]);

    // 如果查询结果为空，说明用户名不存在
    if (results.length === 0) {
      return res.status(401).json({
        code: 0,
        message: "登录失败，用户名不存在",
        data: null,
      });
    }

    const user = results[0];

    // 对密码进行校验
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        code: 0,
        message: "用户名或密码错误",
        data: null,
      });
    }

    // 生成用户 token
    const token = jwt.sign({ id: user.id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      code: 1,
      message: "登录成功",
      data: { token },
    });
  } catch (error) {
    console.error("登录过程中出错:", error);
    res.status(500).json({
      code: 0,
      message: "登录失败，请稍后再试",
      data: null,
    });
  }
});

/**
 * 获取用户信息接口
 */
router.get("/users/profile", verifyUserToken, (req, res) => {
  const userId = req.user.id;
  const checkSql =
    "SELECT id, username, nickname, avatar_url FROM users WHERE id = ?";
  db.query(checkSql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        code: 0,
        message: "数据库查询出错，获取用户信息失败",
        data: null,
      });
    }
    if (results.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "未找到该用户信息",
        data: null,
      });
    }
    res.status(200).json({
      code: 1,
      message: "获取用户信息成功",
      data: results[0],
    });
  });
});

/**
 * 文件上传接口
 */
router.post(
  "/upload",
  verifyUserToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 获取上传的文件
      const images = req.files["images"] || [];
      const video = req.files["video"] ? req.files["video"][0] : null;

      // 返回文件路径
      return res.status(200).json({
        code: 1,
        message: "上传成功",
        data: {
          images: images.map((img) => img.path),
          video: video ? video.path : null,
        },
      });
    } catch (error) {
      console.error("文件上传失败:", error);
      return res.status(500).json({
        code: 0,
        message: "文件上传失败: " + error.message,
        data: null,
      });
    }
  }
);

/**
 * 用户发布游记接口
 */
router.post("/notes", verifyUserToken, async (req, res) => {
  const { title, content, images, video_url } = req.body;
  const userId = req.user.id;

  // 校验请求体
  if (!title || !content) {
    return res.status(400).json({
      code: 0,
      message: "标题和内容为必填项",
      data: null,
    });
  }

  if (!images || images.length === 0) {
    return res.status(400).json({
      code: 0,
      message: "请至少上传一张图片",
      data: null,
    });
  }

  // 开启事务
  const connection = await db.promise().getConnection();
  await connection.beginTransaction();

  try {
    // 添加游记基本信息
    const addSql = `
        INSERT INTO travel_notes (user_id, title, content, video_url, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
      `;
    const [results] = await connection.query(addSql, [
      userId,
      title,
      content,
      video_url || null,
    ]);

    const travelNotesId = results.insertId;

    // 添加游记图片数据
    const imageValues = images.map((image) => [travelNotesId, image, 0]);
    const addImagesSql =
      "INSERT INTO note_images (travel_notes_id, image_url, is_deleted) VALUES ?";
    await connection.query(addImagesSql, [imageValues]);

    // 提交事务
    await connection.commit();

    return res.status(201).json({
      code: 1,
      message: "发布成功",
      data: {
        id: travelNotesId,
        title,
        content,
        images,
        video: video_url,
      },
    });
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error("发布失败:", error);
    return res.status(500).json({
      code: 0,
      message: "发布失败: " + error.message,
      data: null,
    });
  } finally {
    connection.release();
  }
});

/**
 * 用户修改游记接口
 */
router.put(
  "/notes/modify/:id",
  verifyUserToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    const { id } = req.params; //获取请求参数里的游记id
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
      // 验证游记归属权
      const [existing] = await db
        .promise()
        .query(
          "SELECT id, video_url FROM travel_notes WHERE id = ? AND user_id = ? AND is_deleted = 0",
          [id, userId]
        );

      if (!existing.length) {
        return res.status(404).json({
          code: 0,
          message: "游记不存在或没有修改权限",
          data: null,
        });
      }

      // 开启事务
      const connection = await db.promise().getConnection();
      await connection.beginTransaction();

      try {
        // 更新主表数据
        const updateFields = {
          title,
          content,
          status: "pending",
          updated_at: new Date(),
        };

        // 处理新上传视频
        if (req.files["video"]) {
          const videoFile = req.files["video"][0];
          updateFields.video_url = videoFile.path;
        }

        await connection.query(
          "UPDATE travel_notes SET ? WHERE id = ? AND is_deleted = 0",
          [updateFields, id]
        );

        // 删除旧图片(逻辑删除)，添加新图片
        if (req.files["images"]) {
          await connection.query(
            "UPDATE note_images SET is_deleted = 1 WHERE travel_notes_id = ? AND is_deleted = 0",
            [id]
          );
          const values = req.files["images"].map((f) => [id, f.path, 0]);
          await connection.query(
            "INSERT INTO note_images (travel_notes_id, image_url, is_deleted) VALUES ?",
            [values]
          );
        }

        // 提交事务
        await connection.commit();

        return res.status(201).json({
          code: 1,
          message: "修改成功",
          data: null,
        });

        // 回滚事务
      } catch (transactionErr) {
        await connection.rollback();
        return res.status(500).json({
          code: 0,
          message: "修改失败",
          data: null,
        });
      } finally {
        connection.release();
      }
    } catch (err) {
      return res.status(500).json({
        code: 0,
        message: "服务器内部错误",
        data: null,
      });
    }
  }
);

/**
 * 用户删除游记接口(更新状态实现逻辑删除)
 */
router.delete("/notes/delete/:id", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 开启事务
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 验证游记归属权
      const [checkResult] = await connection.query(
        `SELECT id FROM travel_notes WHERE id = ? AND user_id = ? AND is_deleted = 0`,
        [id, userId]
      );

      if (checkResult.length === 0) {
        return res.status(404).json({
          code: 0,
          message: "游记不存在或没有删除权限",
          data: null,
        });
      }

      // 标记游记为已删除
      await connection.query(
        `UPDATE travel_notes SET is_deleted = 1,updated_at = NOW() WHERE id = ? AND is_deleted = 0`,
        [id]
      );

      // 删除游记图片
      await connection.query(
        `UPDATE note_images SET is_deleted = 1 WHERE travel_notes_id = ? AND is_deleted = 0`,
        [id]
      );

      await connection.commit();

      return res.json({
        code: 1,
        message: "删除成功",
        data: null,
      });
    } catch (transactionErr) {
      await connection.rollback();
      return res.status(500).json({
        code: 0,
        message: "删除失败",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("数据库错误:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 首页获取游记详情接口
 */
router.get("/notes", async (req, res) => {
  const querySql = `
      SELECT 
        tn.id,
        tn.user_id,
        u.nickname,
        u.avatar_url,
        tn.title,
        tn.content,
        tn.video_url,
        tn.created_at,
        tn.updated_at,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      LEFT JOIN users u
        ON tn.user_id = u.id
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
      GROUP BY tn.id
      ORDER BY tn.updated_at DESC
    `;
  try {
    const [notes] = await db.promise().query(querySql);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images.split(","),
    }));

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器错误",
      data: null,
    });
  }
});

/**
 * 获取用户游记详情接口
 */
router.get("/notes/user/:userId", verifyUserToken, async (req, res) => {
  const { userId } = req.params;
  const querySql = `
      SELECT 
        tn.id,
        tn.user_id,
        tn.title,
        tn.content,
        tn.video_url,
        tn.status,
        tn.reject_reason,
        tn.created_at,
        tn.updated_at,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      WHERE tn.is_deleted = 0
        AND tn.user_id = ?
      GROUP BY tn.id
      ORDER BY tn.updated_at DESC
    `;
  try {
    const [notes] = await db.promise().query(querySql, [userId]);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images.split(","),
    }));

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器错误",
      data: null,
    });
  }
});

/**
 * 用户搜索游记接口(允许未登入访问)
 */
router.get("/notes/search", async (req, res) => {
  const { title, nickname } = req.query;

  // 参数校验
  if (!title && !nickname) {
    return res.status(400).json({
      code: 0,
      message: "至少需要提供标题或用户昵称作为搜索条件",
      data: null,
    });
  }

  try {
    let querySql = `
      SELECT 
        tn.id,
        tn.user_id,
        tn.title,
        tn.video_url,
        tn.created_at,
        u.nickname,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      LEFT JOIN users u 
        ON tn.user_id = u.id
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
    `;

    const conditions = [];
    const params = [];

    // 安全处理搜索条件
    if (title) {
      conditions.push("tn.title LIKE ?");
      params.push(`%${title}%`);
    }
    if (nickname) {
      conditions.push("u.nickname LIKE ?");
      params.push(`%${nickname}%`);
    }

    querySql += ` AND ${conditions.join(" AND ")} 
              GROUP BY tn.id
              ORDER BY tn.created_at DESC`;

    const [notes] = await db.promise().query(querySql, params);

    // 格式化结果
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images.split(","),
    }));

    return res.status(200).json({
      code: 1,
      message: "搜索成功",
      data: {
        list: formatted,
      },
    });
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 管理员注册接口
 */
router.post("/admin/register", (req, res) => {
  const { username, password, role } = req.body;

  // 检查用户名是否已存在
  const checkSql = "SELECT * FROM admins WHERE username =?";
  db.query(checkSql, [username], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({
        code: 0,
        message: "数据库查询出错，注册失败",
        data: null,
      });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({
        code: 0,
        message: "用户名已存在，请更换用户名",
        data: null,
      });
    }

    // 对密码进行哈希处理
    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        return res.status(500).json({
          code: 0,
          message: "密码哈希处理出错，注册失败",
          data: null,
        });
      }

      // 插入新管理员信息
      const insertSql =
        "INSERT INTO admins (username, password_hash, role) VALUES (?,?,?)";
      db.query(
        insertSql,
        [username, hashedPassword, role],
        (insertErr, insertResult) => {
          if (insertErr) {
            return res.status(500).json({
              code: 0,
              message: "注册失败",
              data: null,
            });
          }

          // 生成 token
          const token = jwt.sign({ username, role }, "your_secret_key", {
            expiresIn: "7d",
          });

          res.status(201).json({
            code: 1,
            message: "注册成功",
            data: { token },
          });
        }
      );
    });
  });
});

/**
 * 管理员登入接口
 */
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  // 先查询数据库中是否已经存在该管理员用户名
  const checkSql = "SELECT * FROM admins WHERE username = ?";
  db.query(checkSql, [username], (err, results) => {
    if (err) {
      return res.status(500).json({
        code: 0,
        message: "数据库查询出错，登录失败",
        data: null,
      });
    }

    // 如果查询结果为空，说明用户名不存在
    if (results.length === 0) {
      return res.status(401).json({
        code: 0,
        message: "登录失败，用户名不存在",
        data: null,
      });
    }

    // 对用户名进行密码校验
    const admin = results[0];
    bcrypt.compare(password, admin.password_hash, (compareErr, isMatch) => {
      if (compareErr) {
        return res.status(500).json({
          code: 0,
          message: "密码验证出错，登录失败",
          data: null,
        });
      }

      if (!isMatch) {
        return res.status(400).json({
          code: 0,
          message: "用户名或密码错误",
          data: null,
        });
      }
      // 生成包含用户id和role的token
      const token = jwt.sign({ id: admin.id, role: admin.role }, jwtSecret, {
        expiresIn: "7d",
      });
      res.status(201).json({
        code: 1,
        message: "登录成功",
        data: { token },
      });
    });
  });
});

/**
 * 管理员获取所有游记接口
 */
router.get("/admin/notes", verifyAdminToken, async (req, res) => {
  const querySql = `
      SELECT 
        tn.id,
        tn.user_id,
        tn.title,
        tn.content,
        tn.video_url,
        tn.status,
        tn.created_at,
        tn.updated_at,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      WHERE tn.is_deleted = 0
      GROUP BY tn.id
      ORDER BY tn.updated_at ASC
      LIMIT 10
    `;
  try {
    const [notes] = await db.promise().query(querySql);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images.split(","),
    }));

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器错误",
      data: null,
    });
  }
});

/**
 * 管理员获取指定游记详情接口
 */
router.get("/admin/notes/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;

  const querySql = `
    SELECT 
      tn.id,
      tn.user_id,
      tn.title,
      tn.content,
      tn.video_url,
      tn.status,
      tn.created_at,
      tn.updated_at,
      GROUP_CONCAT(ni.image_url) AS images
    FROM travel_notes tn
    LEFT JOIN note_images ni 
      ON tn.id = ni.travel_notes_id 
      AND ni.is_deleted = 0
    WHERE tn.is_deleted = 0
      AND tn.id = ?
    GROUP BY tn.id
    LIMIT 1
  `;

  try {
    const [notes] = await db.promise().query(querySql, [id]);

    if (notes.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "未找到该游记",
        data: null,
      });
    }

    // 处理图片数据
    const formattedNote = {
      ...notes[0],
      images: notes[0].images
        ? notes[0].images
            .split(",")
            .map((img) => `http://localhost:3300/${img.replace(/\\/g, "/")}`)
        : [],
    };

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: formattedNote,
    });
  } catch (err) {
    console.error("数据库查询错误:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 管理员获取待审核游记列表接口
 */
router.get("/admin/notes", verifyAdminToken, async (req, res) => {
  const querySql = `
      SELECT 
        tn.id,
        tn.user_id,
        tn.title,
        tn.content,
        tn.video_url,
        tn.status,
        tn.created_at,
        tn.updated_at,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      WHERE tn.is_deleted = 0
        AND tn.status = "pending"
      GROUP BY tn.id
      ORDER BY tn.created_at DESC
      LIMIT 10
    `;
  try {
    const [notes] = await db.promise().query(querySql);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images.split(","),
    }));

    return res.status(201).json({
      code: 1,
      message: "请求成功",
      data: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器错误",
      data: null,
    });
  }
});

/**
 * 管理员筛选游记列表接口
 */
router.get("/notes/admin/filter", verifyAdminToken, async (req, res) => {
  const { status, startDate, endDate, page = 1, pageSize = 10 } = req.query;

  // 计算分页偏移量
  const offset = (page - 1) * pageSize;

  let querySql = `
    SELECT SQL_CALC_FOUND_ROWS 
      tn.id,
      tn.title,
      tn.status,
      tn.created_at,
      tn.updated_at,
      GROUP_CONCAT(ni.image_url) AS images
    FROM travel_notes tn
    LEFT JOIN note_images ni ON tn.id = ni.travel_notes_id
    WHERE tn.is_deleted = 0
  `;

  const conditions = [];
  const values = [];

  // 状态筛选
  if (status) {
    conditions.push("tn.status = ?");
    values.push(status);
  }

  // 日期范围筛选
  if (startDate && endDate) {
    conditions.push("DATE(tn.created_at) BETWEEN ? AND ?");
    values.push(startDate, endDate);
  }

  // 拼接查询条件
  if (conditions.length > 0) {
    querySql += " AND " + conditions.join(" AND ");
  }

  // 完整查询语句
  querySql += `
    GROUP BY tn.id
    ORDER BY tn.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  try {
    // 执行查询
    const [notes] = await db
      .promise()
      .query(querySql, [...values, parseInt(pageSize), parseInt(offset)]);

    // 获取总数
    const [totalRes] = await db.promise().query("SELECT FOUND_ROWS() AS total");
    const total = totalRes[0].total;

    // 格式化结果
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
    }));

    res.status(200).json({
      code: 1,
      data: {
        list: formatted,
        total: total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error("查询错误:", err);
    res.status(500).json({
      code: 0,
      message: "服务器错误",
    });
  }
});

/**
 * 管理员通过待审核游记接口
 */
router.put("/notes/approve/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  try {
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 使用排他锁锁定要更新的游记记录
      const lockSql = `SELECT * FROM travel_notes WHERE id =? FOR UPDATE`;
      const [lockedNote] = await connection.query(lockSql, [id]);

      if (lockedNote.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "游记不存在",
          data: null,
        });
      }

      const updateSql = `UPDATE travel_notes SET status = 'approved', updated_at = NOW() WHERE id =?`;
      const [result] = await connection.query(updateSql, [id]);

      await connection.commit();
      res.status(200).json({
        code: 1,
        message: "游记审核已通过",
        data: null,
      });
    } catch (transactionErr) {
      await connection.rollback();
      return res.status(500).json({
        code: 0,
        message: "服务器内部错误",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 管理员拒绝待审核游记接口
 */
router.put("/notes/reject/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { rejectReason } = req.body;
  try {
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 使用排他锁锁定要更新的游记记录
      const lockSql = `SELECT * FROM travel_notes WHERE id =? FOR UPDATE`;
      const [lockedNote] = await connection.query(lockSql, [id]);

      if (lockedNote.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "游记不存在",
          data: null,
        });
      }

      const updateSql = `UPDATE travel_notes SET status = 'rejected', reject_reason = ?, updated_at = NOW() WHERE id = ?`;
      const [result] = await connection.query(updateSql, [rejectReason, id]);

      await connection.commit();
      res.status(200).json({
        code: 1,
        message: "操作成功",
        data: null,
      });
    } catch (transactionErr) {
      await connection.rollback();
      return res.status(500).json({
        code: 0,
        message: "服务器内部错误",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 管理员删除待审核游记接口
 */
router.delete("/notes/delete/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.admin;
  try {
    if (role !== "admin") {
      return res.status(403).json({
        code: 0,
        message: "无权限删除游记",
        data: null,
      });
    }

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 使用排他锁锁定要删除的游记记录
      const lockSql = `SELECT * FROM travel_notes WHERE id =? AND is_deleted = 0 FOR UPDATE`;
      const [lockedNote] = await connection.query(lockSql, [id]);

      if (lockedNote.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "游记不存在或已被删除",
          data: { role },
        });
      }

      // 标记游记为已删除
      const updateSql = `UPDATE travel_notes SET is_deleted = 1, updated_at = NOW() WHERE id =?`;
      await connection.query(updateSql, [id]);

      // 删除游记图片
      const deleteImageSql = `UPDATE note_images SET is_deleted = 1 WHERE travel_notes_id =?`;
      await connection.query(deleteImageSql, [id]);

      await connection.commit();
      res.status(200).json({
        code: 1,
        message: "游记已成功删除",
        data: null,
      });
    } catch (transactionErr) {
      await connection.rollback();
      return res.status(500).json({
        code: 0,
        message: "删除游记失败",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

module.exports = router;
