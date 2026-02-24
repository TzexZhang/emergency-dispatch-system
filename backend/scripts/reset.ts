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

import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

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

    // 重新执行迁移
    logger.info('请运行 npm run db:migrate 重新初始化数据库');
  } catch (error) {
    logger.error('数据库重置失败:', error);
    process.exit(1);
  }
}

main();
