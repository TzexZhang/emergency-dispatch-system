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

  const [depts] = await pool.query('SELECT * FROM t_department');
  console.log('部门数量:', (depts as any).length);
  if ((depts as any).length > 0) {
    console.log('\n部门列表:');
    (depts as any).forEach((d: any) => {
      console.log(`  ${d.id} | ${d.name} | ${d.parent_id || 'NULL'} | Level: ${d.level}`);
    });
  } else {
    console.log('❌ 部门表为空！');
    console.log('\n正在插入默认部门...');

    const deptId1 = 'dept-001';
    const deptId2 = 'dept-002';
    const deptId3 = 'dept-003';
    const deptId4 = 'dept-004';

    await pool.query(
      `INSERT INTO t_department (id, name, parent_id, level, sort_order) VALUES (?, ?, NULL, 0, 1)`,
      [deptId1, '应急指挥中心']
    );
    await pool.query(
      `INSERT INTO t_department (id, name, parent_id, level, sort_order) VALUES (?, ?, ?, 1, 2)`,
      [deptId2, '医疗救护组', deptId1]
    );
    await pool.query(
      `INSERT INTO t_department (id, name, parent_id, level, sort_order) VALUES (?, ?, ?, 1, 3)`,
      [deptId3, '消防救援组', deptId1]
    );
    await pool.query(
      `INSERT INTO t_department (id, name, parent_id, level, sort_order) VALUES (?, ?, ?, 1, 4)`,
      [deptId4, '交通管制组', deptId1]
    );

    console.log('✅ 已插入 4 个默认部门');
  }

  await pool.end();
}

main();
