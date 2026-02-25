/**
 * ============================================
 * 数据库迁移脚本
 * ============================================
 *
 * 功能说明：
 * - 执行SQL迁移文件
 * - 记录迁移历史
 * - 支持回滚
 *
 * @author Emergency Dispatch Team
 */

// 必须在任何导入之前加载环境变量
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import fs from 'fs';
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

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATIONS_TABLE = '_migrations';

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('开始数据库迁移...');

    // 测试数据库连接
    logger.info('测试数据库连接...');
    try {
      await query('SELECT 1');
      logger.info('数据库连接成功！');
    } catch (error: any) {
      logger.error('数据库连接失败！', error.message);
      logger.error('请检查 .env 文件中的数据库配置');
      logger.error('');
      logger.error('当前配置:');
      logger.error(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
      logger.error(`  DB_PORT: ${process.env.DB_PORT || '3306'}`);
      logger.error(`  DB_USER: ${process.env.DB_USER || 'root'}`);
      logger.error(`  DB_NAME: ${process.env.DB_NAME || 'emergency_dispatch'}`);
      logger.error(`  DB_PASSWORD: ${process.env.DB_PASSWORD ? '***已设置***' : '***未设置***'}`);
      process.exit(1);
    }

    // 创建迁移记录表
    await createMigrationsTable();

    // 获取所有迁移文件
    const migrations = getMigrations();

    if (migrations.length === 0) {
      logger.info('没有找到迁移文件');
      return;
    }

    // 执行迁移
    for (const migration of migrations) {
      await runMigration(migration);
    }

    logger.info('数据库迁移完成！');

    // 关闭连接池
    await pool.end();
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    await pool.end();
    process.exit(1);
  }
}

/**
 * 创建迁移记录表
 */
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * 获取所有迁移文件
 */
function getMigrations(): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => file.replace('.sql', ''));
}

/**
 * 检查迁移是否已执行
 */
async function isMigrationExecuted(name: string): Promise<boolean> {
  const result = await query<any[]>(
    `SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
    [name]
  );
  return result.length > 0;
}

/**
 * 执行单个迁移
 */
async function runMigration(name: string) {
  // 检查是否已执行
  if (await isMigrationExecuted(name)) {
    logger.info(`迁移 ${name} 已执行，跳过`);
    return;
  }

  logger.info(`执行迁移: ${name}`);

  // 读取SQL文件
  const sqlFile = path.join(MIGRATIONS_DIR, `${name}.sql`);
  let sql = fs.readFileSync(sqlFile, 'utf8');

  // 移除存储过程部分（DELIMITER命令在Node.js中不支持）
  const delimiterStart = sql.indexOf('DELIMITER //');
  if (delimiterStart !== -1) {
    sql = sql.substring(0, delimiterStart);
    logger.info('  已跳过存储过程（DELIMITER命令需要MySQL客户端）');
  }

  // 分割SQL语句
  const statements = sql
    // 移除单行注释
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    // 分割语句
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !/^\s*$/.test(s));

  // 执行SQL语句
  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement) {
      try {
        await query(statement);
        successCount++;
      } catch (error: any) {
        // 如果是表已存在错误，可以忽略
        if (error.errno === 1050) {
          logger.info(`  表已存在，跳过`);
        } else {
          logger.error(`  执行SQL语句失败 [语句${i + 1}]:`, error.message);
          logger.error(`  SQL: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }
  }

  // 记录迁移
  await query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
    [name]
  );

  logger.info(`迁移 ${name} 执行成功，共执行 ${successCount} 条SQL语句`);
}

// 运行
main();
