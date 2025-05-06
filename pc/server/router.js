import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { db, jwtSecret } from "./config.js";
import CryptoJS from "crypto-js";
import bcrypt from "bcrypt";
import verifyUserToken from "./verifyUserToken.js";

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

// 中间件：验证管理员 token
function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "未提供管理员 token" });
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err || !decoded.isAdmin)
      return res.status(403).json({ error: "无效的管理员 token" });
    req.admin = decoded;
    next();
  });
}

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
      "INSERT INTO users (username, password, nickname, avatar_url) VALUES (?, ?, ?, ?)";
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
        res.status(200).json({
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
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      return res.status(500).json({
        code: 0,
        message: "数据库查询出错，登录失败",
        data: null,
      });
    }

    // 如果查询结果为空，说明用户名不存在
    if (results.length === 0) {
      return res.status(400).json({
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
      res.status(200).json({
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
router.get("/users/me", verifyUserToken, (req, res) => {
  const sql =
    "SELECT id, username, nickname, avatar_url FROM users WHERE id = ?";
  db.query(sql, [req.user.id], (err, results) => {
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

// 发布游记
router.post(
  "/diaries",
  verifyUserToken,
  upload.fields([
    { name: "cover_image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  (req, res) => {
    const { title, content, video_url } = req.body;
    const coverImage = req.files["cover_image"]?.[0]?.path;
    const imagePaths = (req.files["images"] || []).map((f) => f.path);
    const sql =
      'INSERT INTO diaries (user_id, title, content, cover_image, video_url, status) VALUES (?, ?, ?, ?, ?, "pending")';
    db.query(
      sql,
      [req.user.id, title, content, coverImage, video_url],
      (err, results) => {
        if (err) return res.status(500).json({ error: "发布失败" });
        const diaryId = results.insertId;
        if (imagePaths.length === 0) return res.json({ message: "发布成功" });
        const sql2 = "INSERT INTO diary_images (diary_id, image_url) VALUES ?";
        const values = imagePaths.map((p) => [diaryId, p]);
        db.query(sql2, [values], (err2) => {
          if (err2) return res.status(500).json({ error: "保存图片失败" });
          res.json({ message: "发布成功" });
        });
      }
    );
  }
);

// 修改游记
router.put("/diaries/:id", verifyUserToken, (req, res) => {
  const { title, content, video_url } = req.body;
  const sql =
    'UPDATE diaries SET title = ?, content = ?, video_url = ?, status = "pending" WHERE id = ? AND user_id = ?';
  db.query(
    sql,
    [title, content, video_url, req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: "更新失败" });
      res.json({ message: "更新成功" });
    }
  );
});

// 删除游记
router.delete("/diaries/:id", verifyUserToken, (req, res) => {
  const sql = "DELETE FROM diaries WHERE id = ? AND user_id = ?";
  db.query(sql, [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: "删除失败" });
    res.json({ message: "删除成功" });
  });
});

// 获取当前用户游记
router.get("/diaries/my", verifyUserToken, (req, res) => {
  const sql = "SELECT * FROM diaries WHERE user_id = ?";
  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: "获取失败" });
    res.json(results);
  });
});

// 获取游记详情
router.get("/diaries/:id", (req, res) => {
  const sql = "SELECT * FROM diaries WHERE id = ?";
  db.query(sql, [req.params.id], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: "未找到游记" });
    res.json(results[0]);
  });
});

// 搜索游记
router.get("/diaries", (req, res) => {
  const { keyword = "", page = 1, size = 10 } = req.query;
  const offset = (page - 1) * size;
  const sql = "SELECT * FROM diaries WHERE title LIKE ? LIMIT ?, ?";
  db.query(
    sql,
    [`%${keyword}%`, Number(offset), Number(size)],
    (err, results) => {
      if (err) return res.status(500).json({ error: "搜索失败" });
      res.json(results);
    }
  );
});

// 管理员注册接口
router.post("/admin/register", (req, res) => {
  // 对密码进行哈希处理
  const password_hash = CryptoJS.SHA256(password).toString();
  // 检查用户名是否已存在
  const checkQuery = "SELECT * FROM admin WHERE username =?";
  db.query(checkQuery, [username], (checkError, checkResults) => {
    if (checkError) {
      console.error(checkError);
      return res.status(500).json({ error: "服务端错误" });
    }
    if (checkResults.length > 0) {
      return res.status(409).json({ error: "用户名已存在，请选择其他用户名" });
    }
    // 插入新管理员记录
    const insertQuery =
      "INSERT INTO 表名 (username, password_hash, role, created_at) VALUES (?,?, 'admin', NOW())";
    db.query(insertQuery, [username, hashedPassword], (insertError) => {
      if (insertError) {
        console.error(insertError);
        return res.status(500).json({ error: "服务端错误" });
      }
      res.status(201).json({ message: "注册成功" });
    });
  });
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

// 管理员获取待审核游记
router.get("/admin/diaries", verifyAdminToken, (req, res) => {
  const { status = "pending" } = req.query;
  const sql = "SELECT * FROM diaries WHERE status = ?";
  db.query(sql, [status], (err, results) => {
    if (err) return res.status(500).json({ error: "获取失败" });
    res.json(results);
  });
});

// 管理员通过游记
router.post("/admin/diaries/:id/approve", verifyAdminToken, (req, res) => {
  const sql = 'UPDATE diaries SET status = "approved" WHERE id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "审核失败" });
    res.json({ message: "审核通过" });
  });
});

// 管理员驳回游记
router.post("/admin/diaries/:id/reject", verifyAdminToken, (req, res) => {
  const { reason } = req.body;
  const sql =
    'UPDATE diaries SET status = "rejected", reject_reason = ? WHERE id = ?';
  db.query(sql, [reason, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "驳回失败" });
    res.json({ message: "已驳回" });
  });
});

// 管理员删除游记
router.delete("/admin/diaries/:id", verifyAdminToken, (req, res) => {
  const sql = "DELETE FROM diaries WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "删除失败" });
    res.json({ message: "删除成功" });
  });
});

export default router;
