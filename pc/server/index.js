const express = require("express");
const app = express();
const router = require("./router");
const port = 3000;

// 解析 JSON 请求体
app.use(express.json());

// 使用路由
app.use("/api", router);

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
