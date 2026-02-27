import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

const TABLES = ['t_resource', 't_incident', 't_sensitive_building', 't_plotting', 't_dispatch_task'];

async function checkDeletedAt() {
  logger.info('检查表的 deleted_at 字段...\n');

  for (const table of TABLES) {
    try {
      const result = await query<any[]>(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = 'deleted_at'
      `, [table]);

      if (result.length > 0) {
        logger.info(`✓ ${table}: 已存在 deleted_at 字段`);
      } else {
        logger.warn(`✗ ${table}: 缺少 deleted_at 字段`);
      }
    } catch (error: any) {
      logger.error(`✗ ${table}: 检查失败 - ${error.message}`);
    }
  }

  logger.info('\n检查完成');
  process.exit(0);
}

checkDeletedAt();
