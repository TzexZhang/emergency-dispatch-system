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

  const tables = [
    't_resource',
    't_incident',
    't_trajectory',
    't_heatmap_data',
    't_sensitive_building',
    't_notification',
    't_system_log',
    't_dispatch_task',
    't_plotting'
  ];

  console.log('Database record counts:');
  let total = 0;
  for (const table of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    const count = rows[0].count;
    total += count;
    console.log(`  ${table}: ${count} records`);
  }
  console.log(`\nTotal: ${total} records`);

  await pool.end();
}

main();
