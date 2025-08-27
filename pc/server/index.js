const express = require("express");
const cors = require("cors");
const compression = require("compression");
const http = require("http");

const router = require("./router");
const { initWebSocketServer } = require("./ws");
const app = express();

// Swagger setup
const { setupSwagger } = require("./swagger");

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads")); // 静态资源路径
app.use("/api", router);

// Swagger UI
setupSwagger(app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

const PORT = 3300;
const server = http.createServer(app);
initWebSocketServer(server);
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;
