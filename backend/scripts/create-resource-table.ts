/**
 * 创建t_resource表
 */

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
    charset: process.env.DB_CHARSET || 'utf8mb4',
    timezone: process.env.DB_TIMEZONE || '+08:00',
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS t_resource (
        id VARCHAR(36) PRIMARY KEY,
        resource_type_id VARCHAR(36) NOT NULL COMMENT '资源类型ID',
        resource_name VARCHAR(100) NOT NULL COMMENT '资源名称',
        resource_code VARCHAR(50) NOT NULL UNIQUE COMMENT '资源编码',
        resource_status ENUM('online', 'offline', 'alarm', 'maintenance') DEFAULT 'offline' COMMENT '资源状态',
        longitude DECIMAL(11, 8) COMMENT '经度',
        latitude DECIMAL(11, 8) COMMENT '纬度',
        speed DECIMAL(6, 2) DEFAULT 0 COMMENT '速度(km/h)',
        direction DECIMAL(5, 2) DEFAULT 0 COMMENT '方向角(度)',
        properties JSON COMMENT '扩展属性',
        department_id VARCHAR(36) COMMENT '所属部门ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_resource_type (resource_type_id),
        KEY idx_status (resource_status),
        KEY idx_location (longitude, latitude),
        KEY idx_lng (longitude),
        KEY idx_lat (latitude),
        FOREIGN KEY (resource_type_id) REFERENCES t_resource_type(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源表'
    `);

    console.log('✅ t_resource table created successfully');
  } finally {
    await pool.end();
  }
}

main();
