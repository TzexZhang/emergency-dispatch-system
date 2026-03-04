/**
 * 修复脚本：创建缺失的 t_dispatch_task 表
 */

import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'emergency_dispatch',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  timezone: process.env.DB_TIMEZONE || '+08:00',
  connectionLimit: 10,
});

async function fixDispatchTable() {
  console.log('检查 t_dispatch_task 表是否存在...');

  const connection = await pool.getConnection();

  try {
    // 检查表是否存在
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 't_dispatch_task'`,
      [process.env.DB_NAME || 'emergency_dispatch']
    );

    if ((tables as any[]).length > 0) {
      console.log('✅ t_dispatch_task 表已存在');

      // 检查是否有 deleted_at 字段
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 't_dispatch_task' AND COLUMN_NAME = 'deleted_at'`,
        [process.env.DB_NAME || 'emergency_dispatch']
      );

      if ((columns as any[]).length === 0) {
        console.log('添加 deleted_at 字段...');
        await connection.query(`
          ALTER TABLE t_dispatch_task
          ADD COLUMN deleted_at TIMESTAMP NULL COMMENT '删除时间' AFTER completed_at
        `);
        await connection.query(`
          ALTER TABLE t_dispatch_task ADD INDEX idx_deleted (deleted_at)
        `);
        console.log('✅ deleted_at 字段添加成功');
      } else {
        console.log('✅ deleted_at 字段已存在');
      }

      return;
    }

    console.log('创建 t_dispatch_task 表...');

    await connection.query(`
      CREATE TABLE t_dispatch_task (
        id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
        task_type VARCHAR(50) NOT NULL COMMENT '任务类型：dispatch/escort/support',
        task_status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/executing/completed/cancelled',
        priority INT DEFAULT 0 COMMENT '优先级：0-9，数字越大优先级越高',
        resource_id VARCHAR(36) NOT NULL COMMENT '资源ID',
        incident_id VARCHAR(36) NOT NULL COMMENT '事件ID',
        route_geojson JSON COMMENT '路线GeoJSON',
        distance DECIMAL(10, 2) COMMENT '距离（米）',
        estimated_duration INT COMMENT '预计耗时（秒）',
        estimated_arrival TIMESTAMP COMMENT '预计到达时间',
        actual_arrival TIMESTAMP COMMENT '实际到达时间',
        dispatcher_id VARCHAR(36) NOT NULL COMMENT '调度员ID',
        notes TEXT COMMENT '备注',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        completed_at TIMESTAMP NULL COMMENT '完成时间',
        deleted_at TIMESTAMP NULL COMMENT '删除时间',
        INDEX idx_status (task_status),
        INDEX idx_resource (resource_id),
        INDEX idx_incident (incident_id),
        INDEX idx_priority (priority),
        INDEX idx_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调度任务表'
    `);

    console.log('✅ t_dispatch_task 表创建成功');

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

fixDispatchTable()
  .then(() => {
    console.log('修复完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复失败:', error);
    process.exit(1);
  });
