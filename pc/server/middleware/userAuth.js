// 中间件：验证用户 token
function verifyUserToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      code: 0,
      message: "未提供有效的用户 token",
      data: null,
    });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        code: 0,
        message: "无效的用户 token",
        data: null,
      });
    }
    req.user = decoded;
    next();
  });
}
export default verifyUserToken;
