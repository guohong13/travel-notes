// 数据库连接

const express = require("express");
const mysql = require("mysql");
const app = express();

// 设置MySQL连接配置
const connection = mysql.createConnection({
  host: "localhost",
  user: "root", //数据库账号
  password: "root", //数据库密码
  database: "deli", //数据库名称
});

// 连接到MySQL数据库
connection.connect((error) => {
  if (error) throw error;
  console.log("Successfully connected to the database.");
});
app.listen(3300, () => {
  console.log("hello");
});

module.exports = {
  app,
  connection,
};
