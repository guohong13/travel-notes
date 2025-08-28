const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { db, jwtSecret, publicKey, privateKey } = require("./config");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const verifyUserToken = require("./middleware/userAuth");
const { pushToUser } = require("./ws");
const verifyAdminToken = require("./middleware/adminAuth");
const upload = require("./middleware/multerConfig");

const rsaDecrypt = (encryptedBase64) => {
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedBase64, "base64")
    );
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("解密错误:", error);
    return null;
  }
};

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
      : "/uploads/user.jpg";

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
 * 更新用户资料接口（昵称/头像）
 */
router.put("/users/profile", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { nickname, avatar_url } = req.body || {};

  if (!nickname && !avatar_url) {
    return res.status(400).json({
      code: 0,
      message: "缺少需要更新的字段",
      data: null,
    });
  }

  try {
    const fields = [];
    const values = [];
    if (typeof nickname === "string") {
      fields.push("nickname = ?");
      values.push(nickname);
    }
    if (typeof avatar_url === "string") {
      fields.push("avatar_url = ?");
      values.push(avatar_url);
    }
    values.push(userId);

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    const [result] = await db.promise().query(sql, values);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ code: 0, message: "用户不存在", data: null });
    }
    return res.status(200).json({ code: 1, message: "更新成功", data: null });
  } catch (err) {
    console.error("更新用户资料失败:", err);
    return res
      .status(500)
      .json({ code: 0, message: "服务器内部错误", data: null });
  }
});

/**
 * 修改用户密码接口
 */
router.put("/users/password", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { newPassword } = req.body || {};

  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({
      code: 0,
      message: "密码长度不能少于6位",
      data: null,
    });
  }

  try {
    const hashed = await bcrypt.hash(String(newPassword), 10);
    const [result] = await db
      .promise()
      .query("UPDATE users SET password_hash = ? WHERE id = ?", [
        hashed,
        userId,
      ]);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ code: 0, message: "用户不存在", data: null });
    }
    return res
      .status(200)
      .json({ code: 1, message: "修改密码成功", data: null });
  } catch (err) {
    console.error("修改密码失败:", err);
    return res
      .status(500)
      .json({ code: 0, message: "服务器内部错误", data: null });
  }
});

/**
 * 用户头像单文件上传
 */
router.post(
  "/upload/avatar",
  verifyUserToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ code: 0, message: "未选择头像文件", data: null });
      }
      const url = `/uploads/${req.file.filename}`;
      return res
        .status(200)
        .json({ code: 1, message: "上传成功", data: { url } });
    } catch (err) {
      console.error("头像上传失败:", err);
      return res.status(500).json({ code: 0, message: "上传失败", data: null });
    }
  }
);

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
          images: images.map((img) => `/uploads/${img.filename}`),
          video: video ? `/uploads/${video.filename}` : null,
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
  const { title, content, images, video_url, location, locationName, address } =
    req.body;
  const userId = req.user.id;

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

  const locLat =
    location && typeof location.latitude === "number"
      ? location.latitude
      : null;
  const locLng =
    location && typeof location.longitude === "number"
      ? location.longitude
      : null;
  const locName = typeof locationName === "string" ? locationName : null;
  const locAddr = typeof address === "string" ? address : null;

  const connection = await db.promise().getConnection();
  await connection.beginTransaction();

  try {
    const addSql = `
        INSERT INTO travel_notes (user_id, title, content, video_url, status, created_at, updated_at, location_name, location_address, location_lat, location_lng)
        VALUES (?, ?, ?, ?, 'pending', NOW(), NOW(), ?, ?, ?, ?)
      `;
    const [results] = await connection.query(addSql, [
      userId,
      title,
      content,
      video_url || null,
      locName,
      locAddr,
      locLat,
      locLng,
    ]);

    const travelNotesId = results.insertId;

    const imageValues = images.map((image) => [travelNotesId, image, 0]);
    const addImagesSql =
      "INSERT INTO note_images (travel_notes_id, image_url, is_deleted) VALUES ?";
    await connection.query(addImagesSql, [imageValues]);

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
        location_name: locName,
        location_address: locAddr,
        location_lat: locLat,
        location_lng: locLng,
      },
    });
  } catch (error) {
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
router.put("/notes/modify/:id", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, images, video_url, location, locationName, address } =
    req.body;
  const userId = req.user.id;

  try {
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

    const locLat =
      location && typeof location.latitude === "number"
        ? location.latitude
        : null;
    const locLng =
      location && typeof location.longitude === "number"
        ? location.longitude
        : null;
    const locName = typeof locationName === "string" ? locationName : null;
    const locAddr = typeof address === "string" ? address : null;

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      const updateFields = {
        title,
        content,
        video_url: video_url || null,
        status: "pending",
        updated_at: new Date(),
        location_name: locName,
        location_address: locAddr,
        location_lat: locLat,
        location_lng: locLng,
      };

      await connection.query(
        "UPDATE travel_notes SET ? WHERE id = ? AND is_deleted = 0",
        [updateFields, id]
      );

      await connection.query(
        "UPDATE note_images SET is_deleted = 1 WHERE travel_notes_id = ? AND is_deleted = 0",
        [id]
      );

      const imageValues = images.map((image) => [id, image, 0]);
      const addImagesSql =
        "INSERT INTO note_images (travel_notes_id, image_url, is_deleted) VALUES ?";
      await connection.query(addImagesSql, [imageValues]);

      await connection.commit();

      return res.status(201).json({
        code: 1,
        message: "修改成功",
        data: {
          id,
          title,
          content,
          images,
          video: video_url,
          location_name: locName,
          location_address: locAddr,
          location_lat: locLat,
          location_lng: locLng,
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      console.error("修改失败:", transactionErr);
      return res.status(500).json({
        code: 0,
        message: "修改失败: " + transactionErr.message,
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
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

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
        tn.like_count,
        tn.collect_count,
        tn.comment_count,
        tn.location_name,
        tn.location_address,
        tn.location_lat,
        tn.location_lng,
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
      LIMIT ? OFFSET ?
    `;

  const countSql = `
      SELECT COUNT(DISTINCT tn.id) as total
      FROM travel_notes tn
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
    `;

  try {
    // 并行执行查询和计数
    const [notes, countResult] = await Promise.all([
      db.promise().query(querySql, [parseInt(pageSize), offset]),
      db.promise().query(countSql),
    ]);

    const [rows] = notes;
    const [countRows] = countResult;

    const processedRows = rows.map((row) => ({
      ...row,
      images: row.images ? row.images.split(",") : [],
    }));

    const currentPage = parseInt(page);
    const size = parseInt(pageSize);
    const total = countRows[0].total;
    const hasMore = currentPage * size < total;

    return res.status(200).json({
      code: 1,
      message: "获取游记成功",
      data: {
        list: processedRows,
        total,
        pagination: {
          current: currentPage,
          pageSize: size,
          hasMore,
        },
      },
    });
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
 * 获取单条游记详情（允许未登录访问）
 */
router.get("/notes/detail/:id", async (req, res) => {
  const { id } = req.params;

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
      tn.like_count,
      tn.collect_count,
      tn.comment_count,
      tn.location_name,
      tn.location_address,
      tn.location_lat,
      tn.location_lng,
      GROUP_CONCAT(ni.image_url) AS images
    FROM travel_notes tn
    LEFT JOIN note_images ni 
      ON tn.id = ni.travel_notes_id 
      AND ni.is_deleted = 0
    LEFT JOIN users u
      ON tn.user_id = u.id
    WHERE tn.is_deleted = 0
      AND tn.status = 'approved'
      AND tn.id = ?
    GROUP BY tn.id
    LIMIT 1
  `;

  try {
    const [rows] = await db.promise().query(querySql, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "未找到该游记或未通过审核",
        data: null,
      });
    }

    const note = rows[0];
    const formatted = {
      ...note,
      images: note.images ? note.images.split(",") : [],
    };

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: formatted,
    });
  } catch (err) {
    console.error("获取游记详情失败:", err);
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
        tn.location_name,
        tn.location_address,
        tn.location_lat,
        tn.location_lng,
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

    // 安全处理图片数据为空的情况
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
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
        tn.like_count,
        tn.collect_count,
        tn.location_name,
        tn.location_address,
        tn.location_lat,
        tn.location_lng,
        u.nickname,
        u.avatar_url,
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

    if (title) {
      conditions.push("tn.title LIKE ?");
      params.push(`%${title}%`);
    }
    if (nickname) {
      conditions.push("u.nickname LIKE ?");
      params.push(`%${nickname}%`);
    }

    if (conditions.length > 0) {
      querySql += ` AND (${conditions.join(" OR ")})`;
    }
    querySql += ` GROUP BY tn.id ORDER BY tn.created_at DESC`;

    const [notes] = await db.promise().query(querySql, params);

    // 格式化结果
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
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
  const decryptPassword = rsaDecrypt(password);
  if (!decryptPassword) {
    return res.status(400).json({
      code: 0,
      message: "密码解密失败",
      data: null,
    });
  }
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
    bcrypt.hash(decryptPassword, 10, (hashErr, hashedPassword) => {
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
  const decryptPassword = rsaDecrypt(password);
  if (!decryptPassword) {
    return res.status(400).json({
      code: 0,
      message: "密码解密失败",
      data: null,
    });
  }

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
    bcrypt.compare(
      decryptPassword,
      admin.password_hash,
      (compareErr, isMatch) => {
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
      }
    );
  });
});

/**
 * 游记统计接口
 */
router.get("/admin/notes/stats", async (req, res) => {
  const sql = `
        SELECT 
            SUM(status = 'approved' AND is_deleted = 0) as approved,
            SUM(status = 'rejected' AND is_deleted = 0) as rejected,
            SUM(status = 'pending' AND is_deleted = 0) as pending,
            SUM(is_deleted = 1) as deleted
        FROM travel_notes
    `;
  try {
    const [results] = await db.promise().query(sql);
    res.json({
      code: 1,
      data: results[0],
    });
  } catch (err) {
    console.error("统计查询失败:", err);
    res.status(500).json({ code: 0, message: "服务器错误" });
  }
});

/**
 * 用户发布排行接口
 */
router.get("/admin/users/stats", async (req, res) => {
  const sql = `
        SELECT 
            u.username,
            COUNT(tn.id) as count
        FROM users u
        LEFT JOIN travel_notes tn 
            ON u.id = tn.user_id
            AND tn.is_deleted = 0
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 10
    `;
  try {
    const [results] = await db.promise().query(sql);
    res.json({
      code: 1,
      data: results,
    });
  } catch (err) {
    console.error("用户统计失败:", err);
    res.status(500).json({ code: 0, message: "服务器错误" });
  }
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
      video_url: notes[0].video_url,
      images: notes[0].images,
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
      images: note.images,
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

      // 审核通过后推送给作者
      try {
        const [[noteRow]] = await db
          .promise()
          .query("SELECT user_id, title FROM travel_notes WHERE id = ?", [id]);
        if (noteRow) {
          pushToUser(noteRow.user_id, {
            type: "note_review",
            data: {
              noteId: parseInt(id),
              noteTitle: noteRow.title || "",
              action: "approved",
            },
          });
        }
      } catch (_) {}

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

      // 审核拒绝后推送给作者
      try {
        const [[noteRow]] = await db
          .promise()
          .query("SELECT user_id, title FROM travel_notes WHERE id = ?", [id]);
        if (noteRow) {
          pushToUser(noteRow.user_id, {
            type: "note_review",
            data: {
              noteId: parseInt(id),
              noteTitle: noteRow.title || "",
              action: "rejected",
              reason: rejectReason || "",
            },
          });
        }
      } catch (_) {}

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
router.delete("/admin/notes/delete/:id", verifyAdminToken, async (req, res) => {
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

      // 删除后推送给作者
      try {
        const [[noteRow]] = await db
          .promise()
          .query("SELECT user_id, title FROM travel_notes WHERE id = ?", [id]);
        if (noteRow) {
          pushToUser(noteRow.user_id, {
            type: "note_review",
            data: {
              noteId: parseInt(id),
              noteTitle: noteRow.title || "",
              action: "deleted",
            },
          });
        }
      } catch (_) {}

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

/**
 * 点赞/取消点赞接口
 */
router.post("/notes/:id/like", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 检查游记是否存在
      const [noteResult] = await connection.query(
        "SELECT id FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

      if (noteResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "游记不存在或未通过审核",
          data: null,
        });
      }

      // 检查是否已经点赞
      const [likeResult] = await connection.query(
        "SELECT id FROM likes WHERE user_id = ? AND travel_note_id = ?",
        [userId, id]
      );

      let isLiked = false;
      let likeCount = 0;

      if (likeResult.length > 0) {
        // 已点赞，取消点赞
        await connection.query(
          "DELETE FROM likes WHERE user_id = ? AND travel_note_id = ?",
          [userId, id]
        );

        // 更新游记点赞数
        await connection.query(
          "UPDATE travel_notes SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
          [id]
        );

        isLiked = false;
      } else {
        // 未点赞，添加点赞
        await connection.query(
          "INSERT INTO likes (user_id, travel_note_id) VALUES (?, ?)",
          [userId, id]
        );

        // 更新游记点赞数
        await connection.query(
          "UPDATE travel_notes SET like_count = like_count + 1 WHERE id = ?",
          [id]
        );

        isLiked = true;
      }

      // 获取更新后的点赞数
      const [countResult] = await connection.query(
        "SELECT like_count FROM travel_notes WHERE id = ?",
        [id]
      );
      likeCount = countResult[0].like_count;

      await connection.commit();

      // 推送给游记作者（仅在点赞时推送），带上点赞者与游记信息
      try {
        if (isLiked) {
          const [[noteRow]] = await db
            .promise()
            .query("SELECT user_id, title FROM travel_notes WHERE id = ?", [
              id,
            ]);
          if (noteRow) {
            const authorId = noteRow.user_id;
            if (authorId !== userId) {
              const [[fromUser]] = await db
                .promise()
                .query(
                  "SELECT id, nickname, avatar_url FROM users WHERE id = ?",
                  [userId]
                );

              pushToUser(authorId, {
                type: "like",
                data: {
                  noteId: parseInt(id),
                  noteTitle: noteRow.title,
                  fromUserId: userId,
                  fromNickname: fromUser ? fromUser.nickname : "",
                  fromAvatar: fromUser ? fromUser.avatar_url : "",
                  likeCount,
                },
              });
            }
          }
        }
      } catch (_) {}

      res.status(200).json({
        code: 1,
        message: isLiked ? "点赞成功" : "取消点赞成功",
        data: {
          isLiked,
          likeCount,
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      console.error("点赞操作失败:", transactionErr);
      return res.status(500).json({
        code: 0,
        message: "操作失败，请稍后再试",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("点赞接口错误:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取游记点赞状态和数量
 */
router.get("/notes/:id/like", async (req, res) => {
  const { id } = req.params;
  let userId = null;

  // 尝试从可选的 Authorization 中解析用户，未登录也允许访问
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded && decoded.id ? decoded.id : null;
    }
  } catch (_) {}

  try {
    // 检查游记是否存在
    const [noteResult] = await db
      .promise()
      .query(
        "SELECT id, like_count FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

    if (noteResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "游记不存在或未通过审核",
        data: null,
      });
    }

    let isLiked = false;
    if (userId) {
      // 登录用户：检查是否已点赞
      const [likeResult] = await db
        .promise()
        .query(
          "SELECT id FROM likes WHERE user_id = ? AND travel_note_id = ?",
          [userId, id]
        );
      isLiked = likeResult.length > 0;
    }

    const likeCount = noteResult[0].like_count;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        isLiked,
        likeCount,
      },
    });
  } catch (err) {
    console.error("获取点赞状态失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 收藏/取消收藏接口
 */
router.post("/notes/:id/collect", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 检查游记是否存在
      const [noteResult] = await connection.query(
        "SELECT id FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

      if (noteResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "游记不存在或未通过审核",
          data: null,
        });
      }

      // 检查是否已经收藏
      const [collectResult] = await connection.query(
        "SELECT id FROM user_collects WHERE user_id = ? AND note_id = ?",
        [userId, id]
      );

      let isCollected = false;
      let collectCount = 0;

      if (collectResult.length > 0) {
        // 已收藏，取消收藏
        await connection.query(
          "DELETE FROM user_collects WHERE user_id = ? AND note_id = ?",
          [userId, id]
        );
        await connection.query(
          "UPDATE travel_notes SET collect_count = GREATEST(collect_count - 1, 0) WHERE id = ?",
          [id]
        );
        isCollected = false;
      } else {
        // 未收藏，添加收藏
        await connection.query(
          "INSERT INTO user_collects (user_id, note_id) VALUES (?, ?)",
          [userId, id]
        );
        await connection.query(
          "UPDATE travel_notes SET collect_count = collect_count + 1 WHERE id = ?",
          [id]
        );
        isCollected = true;
      }

      // 获取更新后的收藏数
      const [countResult] = await connection.query(
        "SELECT collect_count FROM travel_notes WHERE id = ?",
        [id]
      );
      collectCount = countResult[0].collect_count;

      await connection.commit();

      // 推送给游记作者
      try {
        const [authorRows] = await db
          .promise()
          .query("SELECT user_id FROM travel_notes WHERE id = ?", [id]);
        if (authorRows.length) {
          const authorId = authorRows[0].user_id;
          if (authorId !== userId && isCollected) {
            // 附带收藏者信息与游记标题
            const [[fromUser]] = await db
              .promise()
              .query(
                "SELECT id, nickname, avatar_url FROM users WHERE id = ?",
                [userId]
              );
            const [[noteRow]] = await db
              .promise()
              .query("SELECT title FROM travel_notes WHERE id = ?", [id]);
            pushToUser(authorId, {
              type: "collect",
              data: {
                noteId: parseInt(id),
                noteTitle: noteRow ? noteRow.title : "",
                fromUserId: userId,
                fromNickname: fromUser ? fromUser.nickname : "",
                fromAvatar: fromUser ? fromUser.avatar_url : "",
                collectCount,
              },
            });
          }
        }
      } catch (_) {}

      res.status(200).json({
        code: 1,
        message: isCollected ? "收藏成功" : "取消收藏成功",
        data: {
          isCollected,
          collectCount,
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      console.error("收藏操作失败:", transactionErr);
      return res.status(500).json({
        code: 0,
        message: "操作失败，请稍后再试",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("收藏接口错误:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取游记收藏状态和数量
 */
router.get("/notes/:id/collect", async (req, res) => {
  const { id } = req.params;
  let userId = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded && decoded.id ? decoded.id : null;
    }
  } catch (_) {}

  try {
    // 检查游记是否存在
    const [noteResult] = await db
      .promise()
      .query(
        "SELECT id, collect_count FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

    if (noteResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "游记不存在或未通过审核",
        data: null,
      });
    }

    let isCollected = false;
    if (userId) {
      const [collectResult] = await db
        .promise()
        .query(
          "SELECT id FROM user_collects WHERE user_id = ? AND note_id = ?",
          [userId, id]
        );
      isCollected = collectResult.length > 0;
    }
    const collectCount = noteResult[0].collect_count;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        isCollected,
        collectCount,
      },
    });
  } catch (err) {
    console.error("获取收藏状态失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取用户收藏的游记列表
 */
router.get("/users/collects", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    const querySql = `
      SELECT 
        tn.id,
        tn.title,
        tn.content,
        tn.video_url,
        tn.created_at,
        tn.updated_at,
        tn.like_count,
        tn.collect_count,
        u.nickname,
        u.avatar_url,
        GROUP_CONCAT(ni.image_url) AS images
      FROM user_collects uc
      JOIN travel_notes tn ON uc.note_id = tn.id
      LEFT JOIN note_images ni ON tn.id = ni.travel_notes_id AND ni.is_deleted = 0
      LEFT JOIN users u ON tn.user_id = u.id
      WHERE uc.user_id = ? 
        AND uc.is_deleted = 0
        AND tn.is_deleted = 0 
        AND tn.status = 'approved'
      GROUP BY tn.id
      ORDER BY uc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [notes] = await db
      .promise()
      .query(querySql, [userId, parseInt(pageSize), parseInt(offset)]);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
    }));

    const total = countRows[0].total;
    const currentPage = parseInt(page);
    const size = parseInt(pageSize);
    const hasMore = currentPage * size < total;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        list: formatted,
        total,
        pagination: {
          current: currentPage,
          pageSize: size,
          hasMore,
        },
      },
    });
  } catch (err) {
    console.error("获取用户收藏列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取用户点赞的游记列表
 */
router.get("/users/likes", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    const querySql = `
      SELECT 
        tn.id,
        tn.title,
        tn.content,
        tn.video_url,
        tn.created_at,
        tn.updated_at,
        tn.like_count,
        u.nickname,
        u.avatar_url,
        GROUP_CONCAT(ni.image_url) AS images
      FROM likes l
      JOIN travel_notes tn ON l.travel_note_id = tn.id
      LEFT JOIN note_images ni ON tn.id = ni.travel_notes_id AND ni.is_deleted = 0
      LEFT JOIN users u ON tn.user_id = u.id
      WHERE l.user_id = ? 
        AND tn.is_deleted = 0 
        AND tn.status = 'approved'
      GROUP BY tn.id
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [notes] = await db
      .promise()
      .query(querySql, [userId, parseInt(pageSize), parseInt(offset)]);

    // 格式化图片数据
    const formatted = notes.map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
    }));

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        list: formatted,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error("获取用户点赞列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取关注用户的游记列表
 */
router.get("/notes/following", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

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
        tn.like_count,
        tn.collect_count,
        tn.comment_count,
        tn.location_name,
        tn.location_address,
        tn.location_lat,
        tn.location_lng,
        GROUP_CONCAT(ni.image_url) AS images
      FROM travel_notes tn
      LEFT JOIN note_images ni 
        ON tn.id = ni.travel_notes_id 
        AND ni.is_deleted = 0
      LEFT JOIN users u
        ON tn.user_id = u.id
      INNER JOIN user_follows uf
        ON tn.user_id = uf.following_id
        AND uf.follower_id = ?
        AND uf.is_deleted = 0
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
      GROUP BY tn.id
      ORDER BY tn.updated_at DESC
      LIMIT ? OFFSET ?
    `;

  const countSql = `
      SELECT COUNT(DISTINCT tn.id) as total
      FROM travel_notes tn
      INNER JOIN user_follows uf
        ON tn.user_id = uf.following_id
        AND uf.follower_id = ?
        AND uf.is_deleted = 0
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
    `;

  try {
    const [notes, countResult] = await Promise.all([
      db.promise().query(querySql, [userId, parseInt(pageSize), offset]),
      db.promise().query(countSql, [userId]),
    ]);

    const total = countResult[0][0].total;
    const totalPages = Math.ceil(total / parseInt(pageSize));
    const hasMore = parseInt(page) < totalPages;

    const formatted = notes[0].map((note) => ({
      ...note,
      images: note.images ? note.images.split(",") : [],
    }));

    return res.status(200).json({
      code: 1,
      message: "请求成功",
      data: {
        list: formatted,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages,
          hasMore,
        },
      },
    });
  } catch (err) {
    console.error("获取关注列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器错误",
      data: null,
    });
  }
});

/**
 * 关注/取消关注用户接口
 */
router.post("/users/follow", verifyUserToken, async (req, res) => {
  const { targetUserId } = req.body;
  const followerId = req.user.id;

  // 不能关注自己
  if (followerId === parseInt(targetUserId)) {
    return res.status(400).json({
      code: 0,
      message: "不能关注自己",
      data: null,
    });
  }

  try {
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 检查目标用户是否存在
      const [targetUser] = await connection.query(
        "SELECT id FROM users WHERE id = ?",
        [targetUserId]
      );

      if (targetUser.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          code: 0,
          message: "目标用户不存在",
          data: null,
        });
      }

      // 检查是否已经关注
      const [existingFollow] = await connection.query(
        "SELECT id, is_deleted FROM user_follows WHERE follower_id = ? AND following_id = ?",
        [followerId, targetUserId]
      );

      let isFollowing = false;
      let action = "";

      if (existingFollow.length > 0) {
        if (existingFollow[0].is_deleted) {
          // 重新关注
          await connection.query(
            "UPDATE user_follows SET is_deleted = 0, updated_at = NOW() WHERE follower_id = ? AND following_id = ?",
            [followerId, targetUserId]
          );
          isFollowing = true;
          action = "重新关注";
        } else {
          // 取消关注
          await connection.query(
            "UPDATE user_follows SET is_deleted = 1, updated_at = NOW() WHERE follower_id = ? AND following_id = ?",
            [followerId, targetUserId]
          );
          isFollowing = false;
          action = "取消关注";
        }
      } else {
        // 新增关注
        await connection.query(
          "INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)",
          [followerId, targetUserId]
        );
        isFollowing = true;
        action = "关注";
      }

      await connection.commit();

      // 推送给被关注者，附带关注者基本信息
      try {
        if (isFollowing) {
          const [[fromUser]] = await db
            .promise()
            .query("SELECT id, nickname, avatar_url FROM users WHERE id = ?", [
              followerId,
            ]);
          pushToUser(parseInt(targetUserId), {
            type: "follow",
            data: {
              fromUserId: followerId,
              fromNickname: fromUser ? fromUser.nickname : "",
              fromAvatar: fromUser ? fromUser.avatar_url : "",
            },
          });
        }
      } catch (_) {}

      res.status(200).json({
        code: 1,
        message: `${action}成功`,
        data: {
          isFollowing,
          targetUserId: parseInt(targetUserId),
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      console.error("关注操作失败:", transactionErr);
      return res.status(500).json({
        code: 0,
        message: "操作失败，请稍后再试",
        data: null,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("关注接口错误:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取关注状态接口
 */
router.get(
  "/users/follow/status/:targetUserId",
  verifyUserToken,
  async (req, res) => {
    const { targetUserId } = req.params;
    const followerId = req.user.id;

    try {
      const [followResult] = await db
        .promise()
        .query(
          "SELECT id, is_deleted FROM user_follows WHERE follower_id = ? AND following_id = ?",
          [followerId, targetUserId]
        );

      const isFollowing =
        followResult.length > 0 && !followResult[0].is_deleted;

      res.status(200).json({
        code: 1,
        message: "获取成功",
        data: {
          isFollowing,
          targetUserId: parseInt(targetUserId),
        },
      });
    } catch (err) {
      console.error("获取关注状态失败:", err);
      return res.status(500).json({
        code: 0,
        message: "服务器内部错误",
        data: null,
      });
    }
  }
);

/**
 * 获取用户的关注列表接口
 */
router.get("/users/following", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    const querySql = `
      SELECT 
        u.id,
        u.username,
        u.nickname,
        u.avatar_url,
        uf.created_at as follow_time
      FROM user_follows uf
      JOIN users u ON uf.following_id = u.id
      WHERE uf.follower_id = ? 
        AND uf.is_deleted = 0
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM user_follows uf
      WHERE uf.follower_id = ? 
        AND uf.is_deleted = 0
    `;

    const [users, countResult] = await Promise.all([
      db.promise().query(querySql, [userId, parseInt(pageSize), offset]),
      db.promise().query(countSql, [userId]),
    ]);

    const total = countResult[0][0].total;
    const totalPages = Math.ceil(total / parseInt(pageSize));
    const hasMore = parseInt(page) < totalPages;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        list: users[0],
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages,
          hasMore,
        },
      },
    });
  } catch (err) {
    console.error("获取关注列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取用户的粉丝列表接口
 */
router.get("/users/followers", verifyUserToken, async (req, res) => {
  const userId = req.user.id;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    const querySql = `
      SELECT 
        u.id,
        u.username,
        u.nickname,
        u.avatar_url,
        uf.created_at as follow_time
      FROM user_follows uf
      JOIN users u ON uf.follower_id = u.id
      WHERE uf.following_id = ? 
        AND uf.is_deleted = 0
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM user_follows uf
      WHERE uf.following_id = ? 
        AND uf.is_deleted = 0
    `;

    const [users, countResult] = await Promise.all([
      db.promise().query(querySql, [userId, parseInt(pageSize), offset]),
      db.promise().query(countSql, [userId]),
    ]);

    const total = countResult[0][0].total;
    const totalPages = Math.ceil(total / parseInt(pageSize));
    const hasMore = parseInt(page) < totalPages;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        list: users[0],
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages,
          hasMore,
        },
      },
    });
  } catch (err) {
    console.error("获取粉丝列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取游记评论列表接口
 */
router.get("/notes/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  try {
    // 检查游记是否存在
    const [noteResult] = await db
      .promise()
      .query(
        "SELECT id FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

    if (noteResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "游记不存在或未通过审核",
        data: null,
      });
    }

    const querySql = `
      SELECT 
        c.id,
        c.note_id,
        c.user_id,
        c.content,
        c.like_count,
        c.created_at,
        c.updated_at,
        u.nickname,
        u.avatar_url
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.note_id = ? AND c.is_deleted = 0
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM comments c
      WHERE c.note_id = ? AND c.is_deleted = 0
    `;

    const [comments, countResult] = await Promise.all([
      db.promise().query(querySql, [id, parseInt(pageSize), offset]),
      db.promise().query(countSql, [id]),
    ]);

    const total = countResult[0][0].total;
    const totalPages = Math.ceil(total / parseInt(pageSize));
    const hasMore = parseInt(page) < totalPages;

    // 如果用户已登录，获取评论点赞状态
    let commentsWithLikeStatus = comments[0];
    const userInfo = req.headers.authorization
      ? jwt.verify(req.headers.authorization.replace("Bearer ", ""), jwtSecret)
      : null;

    if (userInfo && userInfo.id) {
      const userId = userInfo.id;
      const commentIds = comments[0].map((c) => c.id);

      if (commentIds.length > 0) {
        const [likeResults] = await db
          .promise()
          .query(
            "SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (?)",
            [userId, commentIds]
          );

        const likedCommentIds = new Set(likeResults.map((r) => r.comment_id));

        commentsWithLikeStatus = comments[0].map((comment) => ({
          ...comment,
          isLiked: likedCommentIds.has(comment.id),
        }));
      }
    } else {
      commentsWithLikeStatus = comments[0].map((comment) => ({
        ...comment,
        isLiked: false,
      }));
    }

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        list: commentsWithLikeStatus,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages,
          hasMore,
        },
      },
    });
  } catch (err) {
    console.error("获取评论列表失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 发表评论接口
 */
router.post("/notes/:id/comments", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({
      code: 0,
      message: "评论内容不能为空",
      data: null,
    });
  }

  if (content.trim().length > 500) {
    return res.status(400).json({
      code: 0,
      message: "评论内容不能超过500字",
      data: null,
    });
  }

  try {
    // 检查游记是否存在
    const [noteResult] = await db
      .promise()
      .query(
        "SELECT id FROM travel_notes WHERE id = ? AND is_deleted = 0 AND status = 'approved'",
        [id]
      );

    if (noteResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "游记不存在或未通过审核",
        data: null,
      });
    }

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 插入评论
      const [commentResult] = await connection.query(
        "INSERT INTO comments (note_id, user_id, content) VALUES (?, ?, ?)",
        [id, userId, content.trim()]
      );

      const commentId = commentResult.insertId;

      // 更新游记评论数
      await connection.query(
        "UPDATE travel_notes SET comment_count = comment_count + 1 WHERE id = ?",
        [id]
      );

      await connection.commit();

      // 获取新插入的评论信息
      const [newComment] = await db.promise().query(
        `SELECT 
            c.id,
            c.note_id,
            c.user_id,
            c.content,
            c.like_count,
            c.created_at,
            c.updated_at,
            u.nickname,
            u.avatar_url
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.id = ?`,
        [commentId]
      );

      // 推送给游记作者
      try {
        const [authorRows] = await db
          .promise()
          .query("SELECT user_id FROM travel_notes WHERE id = ?", [id]);
        if (authorRows.length) {
          const authorId = authorRows[0].user_id;
          if (authorId !== userId) {
            // 附带评论者信息与游记标题
            const [[fromUser]] = await db
              .promise()
              .query(
                "SELECT id, nickname, avatar_url FROM users WHERE id = ?",
                [userId]
              );
            const [[noteRow]] = await db
              .promise()
              .query("SELECT title FROM travel_notes WHERE id = ?", [id]);

            pushToUser(authorId, {
              type: "comment",
              data: {
                noteId: parseInt(id),
                noteTitle: noteRow ? noteRow.title : "",
                commentId,
                fromUserId: userId,
                fromNickname: fromUser ? fromUser.nickname : "",
                fromAvatar: fromUser ? fromUser.avatar_url : "",
              },
            });
          }
        }
      } catch (_) {}

      res.status(201).json({
        code: 1,
        message: "评论发表成功",
        data: {
          ...newComment[0],
          isLiked: false,
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      throw transactionErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("发表评论失败:", err);
    return res.status(500).json({
      code: 0,
      message: "发表评论失败，请稍后再试",
      data: null,
    });
  }
});

/**
 * 评论点赞/取消点赞接口
 */
router.post("/comments/:id/like", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 检查评论是否存在
    const [commentResult] = await db
      .promise()
      .query("SELECT id FROM comments WHERE id = ? AND is_deleted = 0", [id]);

    if (commentResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "评论不存在",
        data: null,
      });
    }

    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 检查是否已经点赞
      const [likeResult] = await connection.query(
        "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [id, userId]
      );

      let isLiked = false;
      let likeCount = 0;

      if (likeResult.length > 0) {
        // 已点赞，取消点赞
        await connection.query(
          "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?",
          [id, userId]
        );

        // 更新评论点赞数
        await connection.query(
          "UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?",
          [id]
        );

        isLiked = false;
      } else {
        // 未点赞，添加点赞
        await connection.query(
          "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
          [id, userId]
        );

        // 更新评论点赞数
        await connection.query(
          "UPDATE comments SET like_count = like_count + 1 WHERE id = ?",
          [id]
        );

        isLiked = true;
      }

      // 获取更新后的点赞数
      const [countResult] = await connection.query(
        "SELECT like_count FROM comments WHERE id = ?",
        [id]
      );
      likeCount = countResult[0].like_count;

      await connection.commit();

      res.status(200).json({
        code: 1,
        message: isLiked ? "点赞成功" : "取消点赞成功",
        data: {
          isLiked,
          likeCount,
        },
      });
    } catch (transactionErr) {
      await connection.rollback();
      throw transactionErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("评论点赞操作失败:", err);
    return res.status(500).json({
      code: 0,
      message: "操作失败，请稍后再试",
      data: null,
    });
  }
});

/**
 * 获取评论点赞状态接口
 */
router.get("/comments/:id/like", verifyUserToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // 检查评论是否存在
    const [commentResult] = await db
      .promise()
      .query(
        "SELECT id, like_count FROM comments WHERE id = ? AND is_deleted = 0",
        [id]
      );

    if (commentResult.length === 0) {
      return res.status(404).json({
        code: 0,
        message: "评论不存在",
        data: null,
      });
    }

    // 检查用户是否已点赞
    const [likeResult] = await db
      .promise()
      .query(
        "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [id, userId]
      );

    const isLiked = likeResult.length > 0;
    const likeCount = commentResult[0].like_count;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        isLiked,
        likeCount,
      },
    });
  } catch (err) {
    console.error("获取评论点赞状态失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

/**
 * 获取用户获赞总数接口
 */
router.get("/users/received-likes", verifyUserToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const countSql = `
      SELECT COALESCE(SUM(tn.like_count), 0) as total
      FROM travel_notes tn
      WHERE tn.user_id = ? 
        AND tn.is_deleted = 0 
        AND tn.status = 'approved'
    `;

    const [countResult] = await db.promise().query(countSql, [userId]);
    const total = countResult[0].total;

    res.status(200).json({
      code: 1,
      message: "获取成功",
      data: {
        total: parseInt(total),
      },
    });
  } catch (err) {
    console.error("获取用户获赞总数失败:", err);
    return res.status(500).json({
      code: 0,
      message: "服务器内部错误",
      data: null,
    });
  }
});

module.exports = router;
