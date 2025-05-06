// 数据库相关配置

import mysql from "mysql2";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "travel-notes",
});

const jwtSecret = "cughpscil";

export default { db, jwtSecret };
