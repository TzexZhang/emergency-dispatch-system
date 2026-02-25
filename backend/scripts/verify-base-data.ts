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

  console.log('基础数据验证：\n');

  const [types] = await pool.query('SELECT COUNT(*) as count FROM t_resource_type');
  const [depts] = await pool.query('SELECT COUNT(*) as count FROM t_department');
  const [users] = await pool.query('SELECT COUNT(*) as count FROM t_user');

  console.log(`✅ 资源类型: ${(types as any)[0].count} 条`);
  console.log(`✅ 部门: ${(depts as any)[0].count} 条`);
  console.log(`✅ 用户: ${(users as any)[0].count} 条\n`);

  // 更新管理员部门
  await pool.query('UPDATE t_user SET department_id = ? WHERE username = ? AND department_id IS NULL', ['dept-001', 'admin']);
  console.log('✅ 已更新管理员部门信息\n');

  console.log('基础数据准备完成！现在可以运行测试数据插入脚本：');
  console.log('  npx tsx scripts/insert-test-data.ts\n');

  await pool.end();
}

main();
