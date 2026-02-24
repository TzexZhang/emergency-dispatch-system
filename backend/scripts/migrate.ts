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

import fs from 'fs';
import path from 'path';
import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATIONS_TABLE = '_migrations';

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('开始数据库迁移...');

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
  } catch (error) {
    logger.error('数据库迁移失败:', error);
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
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // 分割SQL语句（以分号分隔）
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  // 执行SQL语句
  for (const statement of statements) {
    await query(statement);
  }

  // 记录迁移
  await query(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
    [name]
  );

  logger.info(`迁移 ${name} 执行成功`);
}

// 运行
main();
