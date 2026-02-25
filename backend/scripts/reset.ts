/**
 * ============================================
 * 数据库重置脚本
 * ============================================
 *
 * 功能说明：
 * - 删除所有数据
 * - 重新初始化
 *
 * @author Emergency Dispatch Team
 */

// 必须在任何导入之前加载环境变量
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';

// 直接创建数据库连接池（避免config.ts缓存问题）
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

// 简单的查询函数
async function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// 简单的logger
const logger = {
  info: (msg: string) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
  error: (msg: string, error?: any) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, error || ''),
};

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('开始重置数据库...');

    // 删除所有表数据
    const tables = [
      't_system_log',
      't_notification',
      't_plotting',
      't_dispatch_task',
      't_trajectory',
      't_heatmap_data',
      't_alert_rule',
      't_map_config',
      't_sensitive_building',
      't_incident',
      't_resource',
      't_user',
      't_resource_type',
      't_department',
    ];

    for (const table of tables) {
      await query(`DELETE FROM ${table}`);
      logger.info(`清空表: ${table}`);
    }

    logger.info('数据库重置完成！');

    // 关闭连接池
    await pool.end();

    // 重新执行迁移
    logger.info('请运行 npm run db:migrate 重新初始化数据库');
  } catch (error) {
    logger.error('数据库重置失败:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
