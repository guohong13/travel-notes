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
