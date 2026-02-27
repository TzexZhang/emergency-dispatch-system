/**
 * ============================================
 * 数据库连接管理
 * ============================================
 *
 * 功能说明：
 * - MySQL连接池管理
 * - 连接复用和释放
 * - 连接健康检查
 * - 事务管理
 *
 * @author Emergency Dispatch Team
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { logger } from './logger';
import { config } from './config';

/**
 * 创建MySQL连接池
 *
 * 连接池配置说明：
 * - connectionLimit: 最大连接数
 * - queueLimit: 等待队列最大长度
 * - waitForConnections: 连接池满时是否等待
 * - enableKeepAlive: 保持连接活跃
 */
const pool: Pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  database: config.database.database,
  charset: config.database.charset,
  timezone: config.database.timezone,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // 使用占位符而非命名参数
  namedPlaceholders: false,

  // 日期格式化
  dateStrings: false,
});

/**
 * 执行查询
 *
 * @param sql - SQL语句
 * @param params - 查询参数
 * @returns 查询结果
 *
 * @example
 * ```typescript
 * const users = await query('SELECT * FROM t_user WHERE status = ?', ['active']);
 * ```
 */
export async function query<T = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const start = Date.now();
    const [results] = await connection.execute(sql, params || []);
    const duration = Date.now() - start;

    // 记录慢查询（超过1秒）
    if (duration > 1000) {
      logger.warn(`慢查询检测 (${duration}ms): ${sql}`);
    }

    return results as T;
  } catch (error) {
    logger.error(`数据库查询错误: ${error}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 执行插入操作
 *
 * @param tableName - 表名
 * @param data - 插入数据
 * @returns 插入ID
 *
 * @example
 * ```typescript
 * const insertId = await insert('t_user', { username: 'admin', password: 'xxx' });
 * ```
 */
export async function insert(tableName: string, data: Record<string, any>): Promise<string> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');

  const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

  try {
    const result = (await query<ResultSetHeader>(sql, values)) as ResultSetHeader;
    return result.insertId.toString();
  } catch (error) {
    logger.error(`插入数据错误 [${tableName}]: ${error}`);
    throw error;
  }
}

/**
 * 执行更新操作
 *
 * @param tableName - 表名
 * @param data - 更新数据
 * @param where - WHERE条件
 * @returns 影响行数
 *
 * @example
 * ```typescript
 * const affectedRows = await update('t_user', { status: 'inactive' }, { id: 'xxx' });
 * ```
 */
export async function update(
  tableName: string,
  data: Record<string, any>,
  where: Record<string, any>
): Promise<number> {
  const setClause = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');
  const whereClause = Object.keys(where)
    .map(key => `${key} = ?`)
    .join(' AND ');

  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
  const params = [...Object.values(data), ...Object.values(where)];

  try {
    const result = (await query<ResultSetHeader>(sql, params)) as ResultSetHeader;
    return result.affectedRows;
  } catch (error) {
    logger.error(`更新数据错误 [${tableName}]: ${error}`);
    throw error;
  }
}

/**
 * 执行删除操作
 *
 * @param tableName - 表名
 * @param where - WHERE条件
 * @returns 影响行数
 *
 * @example
 * ```typescript
 * const affectedRows = await delete('t_user', { id: 'xxx' });
 * ```
 */
export async function deleteData(
  tableName: string,
  where: Record<string, any>
): Promise<number> {
  const whereClause = Object.keys(where)
    .map(key => `${key} = ?`)
    .join(' AND ');

  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
  const params = Object.values(where);

  try {
    const result = (await query<ResultSetHeader>(sql, params)) as ResultSetHeader;
    return result.affectedRows;
  } catch (error) {
    logger.error(`删除数据错误 [${tableName}]: ${error}`);
    throw error;
  }
}

/**
 * 事务管理器
 *
 * @param callback - 事务回调函数
 * @returns 回调函数返回值
 *
 * @example
 * ```typescript
 * await transaction(async (connection) => {
 *   await connection.execute('INSERT INTO t_account ...');
 *   await connection.execute('UPDATE t_balance ...');
 * });
 * ```
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error(`事务执行错误: ${error}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 数据库健康检查
 *
 * @returns 健康状态
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
}

/**
 * 优雅关闭数据库连接池
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('数据库连接池已关闭');
  } catch (error) {
    logger.error('关闭数据库连接池失败:', error);
  }
}

// 进程退出时关闭连接池
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

export { pool };
export default { query, insert, update, deleteData, transaction, healthCheck, closePool };
