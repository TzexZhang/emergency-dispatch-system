import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

async function addDeletedAtToSensitiveBuilding() {
  try {
    logger.info('为 t_sensitive_building 表添加 deleted_at 字段...');

    await query(`
      ALTER TABLE t_sensitive_building 
      ADD COLUMN deleted_at TIMESTAMP NULL COMMENT '删除时间' AFTER updated_at,
      ADD INDEX idx_deleted (deleted_at)
    `);

    logger.info('✓ t_sensitive_building 表添加 deleted_at 字段成功');
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      logger.info('✓ t_sensitive_building 表已存在 deleted_at 字段');
      process.exit(0);
    }
    logger.error('添加字段失败:', error);
    process.exit(1);
  }
}

addDeletedAtToSensitiveBuilding();
