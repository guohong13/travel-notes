// 中间件：验证管理员 token

const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: 0,
      message: "未提供有效的管理员 token",
      data: null,
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        code: 0,
        message: "无效的管理员 token",
        data: null,
      });
    }
    req.admin = decoded;
    next();
  });
}

module.exports = verifyAdminToken;
