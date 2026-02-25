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

  const [users] = await pool.query('SELECT id, username, real_name FROM t_user');
  const userList = users as any[];

  console.log('数据库中的用户:');
  userList.forEach(u => {
    console.log(`  ID: ${u.id}`);
    console.log(`  用户名: ${u.username}`);
    console.log(`  真实姓名: ${u.real_name}`);
    console.log('');
  });

  // 保存第一个用户ID到文件供后续使用
  if (userList.length > 0) {
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, 'user-id.txt'), userList[0].id);
    console.log(`已保存管理员ID: ${userList[0].id}`);
  }

  await pool.end();
}

main();
