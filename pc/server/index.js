const express = require("express");
const cors = require("cors");
const compression = require("compression");

const router = require("./router");
const app = express();

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); // 静态资源路径
app.use("/api", router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

const PORT = 3300;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
