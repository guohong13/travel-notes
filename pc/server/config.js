// 数据库相关配置

const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "lqy229347",
  database: "travel-notes",
});

const jwtSecret = "cughpscil";

module.exports = { db, jwtSecret };
