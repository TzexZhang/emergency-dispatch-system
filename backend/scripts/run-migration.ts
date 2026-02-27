import fs from 'fs';
import path from 'path';
import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

/**
 * 执行 SQL 迁移脚本
 */
async function runMigration(sqlFilePath: string): Promise<void> {
  try {
    const absolutePath = path.resolve(process.cwd(), sqlFilePath);

    if (!fs.existsSync(absolutePath)) {
      logger.error(`SQL 文件不存在: ${absolutePath}`);
      process.exit(1);
    }

    logger.info(`读取 SQL 文件: ${absolutePath}`);
    const sqlContent = fs.readFileSync(absolutePath, 'utf-8');

    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    logger.info(`找到 ${statements.length} 条 SQL 语句`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await query(statement);
        logger.info(`✓ 语句 ${i + 1}/${statements.length} 执行成功`);
      } catch (error: any) {
        if (error.message.includes('Duplicate column name')) {
          logger.warn(`⚠ 语句 ${i + 1}/${statements.length} 跳过（字段已存在）`);
        } else {
          logger.error(`✗ 语句 ${i + 1}/${statements.length} 执行失败:`);
          logger.error(statement);
          throw error;
        }
      }
    }

    logger.info('✓ 迁移脚本执行完成');
    process.exit(0);
  } catch (error) {
    logger.error('迁移脚本执行失败:', error);
    process.exit(1);
  }
}

const sqlFilePath = process.argv[2] || 'migrations/005_add_deleted_at.sql';

runMigration(sqlFilePath);
