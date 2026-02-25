// 必须在任何导入之前加载环境变量
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'emergency_dispatch',
    connectionLimit: 10,
  });

  try {
    await pool.query("DELETE FROM _migrations WHERE name = '002_complete_schema'");
    console.log('✅ Migration record cleared for 002_complete_schema');
  } finally {
    await pool.end();
  }
}

main();
