const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const bcrypt = require("bcrypt");
const verifyUserToken = require("./middleware/userAuth");
const { db, jwtSecret } = require("./config.js");
const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

/**
 * 用户注册接口
 */
router.post("/users/register", (req, res) => {
  const { username, password, nickname, avatar_url } = req.body;
  // 判断输入是否为空
  if (!username || !password) {
    return res.status(400).json({
      code: 0,
      message: "用户名、密码不能为空",
      data: null,
    });
  }

  // 先查询数据库中是否已经存在该 username
  const checkSql = "SELECT * FROM users WHERE username = ?";
  db.query(checkSql, [username], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({
        code: 0,
        message: "数据库查询用户名时出错",
        data: null,
      });
    }

    // 如果查询结果不为空，说明用户名已存在
    if (checkResult.length > 0) {
      return res.status(400).json({
        code: 0,
        message: "该用户名已被使用，请选择其他用户名",
        data: null,
      });
    }

    // 用户名不存在，执行插入操作
    const insertSql =
      "INSERT INTO users (username, password_hash, nickname, avatar_url) VALUES (?, ?, ?, ?)";
    db.query(
      insertSql,
      [username, password, nickname, avatar_url],
      (insertErr) => {
        if (insertErr) {
          return res.status(500).json({
            code: 0,
            message: "注册失败",
            data: null,
          });
        }
        res.status(201).json({
          code: 1,
          message: "注册成功",
          data: null,
        });
      }
    );
  });
});

/**
 * 用户登录接口
 */
router.post("/users/login", (req, res) => {
  const { username, password } = req.body;

  // 先查询数据库中是否已经存在该 username
  const checkSql = "SELECT * FROM users WHERE username = ?";
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
    const user = results[0];
    bcrypt.compare(password, user.password_hash, (compareErr, isMatch) => {
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

      // 生成用户 token
      const token = jwt.sign({ id: user.id }, jwtSecret, {
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
 * 用户发布游记接口
 */
router.post(
  "/notes",
  verifyUserToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id; // 从token中获取用户ID

    // 获取图片和视频文件路径
    const imagePaths = req.files["images"].map((f) => f.path);
    const videoFile = (req.files["video"] || [])[0];
    const video_url = videoFile ? videoFile.path : null;

    // 校验请求体中游记标题和内容（非文件内容）
    if (!title || !content) {
      return res.status(400).json({
        code: 0,
        message: "标题和内容为必填项",
        data: null,
      });
    }

    // 开启事务
    const connection = await db.promise().getConnection();
    await connection.beginTransaction();

    try {
      // 添加游记文本和视频数据
      const addSql = `
        INSERT INTO travel_notes (user_id, title, content, video_url, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
        `;
      const [results] = await connection.query(addSql, [
        userId,
        title,
        content,
        video_url,
      ]);

      // 获取游记表的主键id
      const travelNotesId = results.insertId;

      // 添加游记图片数据
      if (imagePaths.length > 0) {
        const values = imagePaths.map((image) => [travelNotesId, image, 0]);
        const addSql2 =
          "INSERT INTO note_images (travel_notes_id, image_url, is_deleted) VALUES ?";
        await connection.query(addSql2, [values]);
      }

      // 提交事务
      await connection.commit();

      return res.status(201).json({
        code: 1,
        message: "发布成功",
        data: null,
      });
    } catch (transactionErr) {
      // 回滚事务
      await connection.rollback();
      return res.status(500).json({
        code: 0,
        message: "发布失败",
        data: null,
      });
    } finally {
      connection.release();
    }
  }
);

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
router.delete("/notes/delete:id", verifyUserToken, async (req, res) => {
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
 * 获取游记详情接口
 */
router.get("/notes", async (req, res) => {
  const querySql = `
      SELECT 
        tn.id,
        tn.user_id,
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
      WHERE tn.is_deleted = 0
        AND tn.status = "approved"
      GROUP BY tn.id
      ORDER BY tn.created_at ASC
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
      ORDER BY tn.created_at ASC
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
// 管理员登录
router.post("/admin/login", async (req, res) => {
  // const { username, password_hash } = req.body;
  const { username, password } = req.body;
  const query = "SELECT * FROM admins WHERE username =? AND password_hash =?";
  // db.query(query, [username, password_hash], (error, results) => {
  db.query(query, [username, password], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "服务端错误" });
    }

    if (results.length > 0) {
      // 用户存在，生成 JWT 令牌
      const token = jwt.sign({ isAdmin: true }, jwtSecret, {
        expiresIn: "7d",
      });
      return res.status(201).json({ token, message: "登入成功" });
    } else {
      // 用户不存在或密码错误
      return res.status(401).json({ error: "用户名或密码错误" });
    }
  });
});

module.exports = router;
