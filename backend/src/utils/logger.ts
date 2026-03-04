/**
 * ============================================
 * 日志管理工具
 * ============================================
 *
 * 功能说明：
 * - 基于Winston的日志系统
 * - 支持多种日志级别和输出目标
 * - 日志文件按日期滚动
 * - 开发环境彩色输出
 *
 * @author Emergency Dispatch Team
 */

import winston from 'winston';
import path from 'path';
import { config } from './config';
import fs from 'fs';

// 确保日志目录存在
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 使用日期作为日志文件名，避免文件锁定问题
const today = new Date().toISOString().split('T')[0];

/**
 * 自定义日志格式
 */
const customFormat = winston.format.combine(
  // 添加时间戳
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  // 添加错误堆栈
  winston.format.errors({ stack: true }),
  // JSON格式化
  winston.format.json(),
  // 自定义输出格式
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 添加元数据
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    // 添加错误堆栈
    if (stack) {
      msg += `\n${stack}`;
    }

    return msg;
  })
);

/**
 * 控制台彩色格式（开发环境）
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

/**
 * 创建Winston Logger实例
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: { service: 'emergency-dispatch-backend' },
  transports: [
    // 错误日志文件 - 使用日期后缀
    new winston.transports.File({
      filename: path.join(logDir, `error-${today}.log`),
      level: 'error',
    }),
    // 综合日志文件 - 使用日期后缀
    new winston.transports.File({
      filename: path.join(logDir, `combined-${today}.log`),
    }),
  ],
  // 禁用默认的异常处理，避免检查旧文件
  exitOnError: false,
});

// 开发环境添加控制台输出
if (config.app.env === 'development') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
}

// 手动处理未捕获异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  logger.error('Unhandled Rejection:', reason);
});

export { logger };
export default logger;
