/**
 * ============================================
 * 错误处理中间件
 * ============================================
 *
 * 功能说明：
 * - 统一错误处理格式
 * - 错误日志记录
 * - 区分开发和生产环境错误响应
 * - 处理各类异常（数据库、验证、业务逻辑等）
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@utils/logger';
import { config } from '@utils/config';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public code: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: number) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || statusCode;
    this.isOperational = true;

    // 维护正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  constructor(message: string, _errors?: any[]) {
    super(message, 400, 400);
    this.name = 'ValidationError';
  }
}

/**
 * 未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 未授权错误类
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, 401, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止访问错误类
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 错误处理中间件
 *
 * 统一处理所有类型的错误
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 记录错误日志
  logger.error(`错误处理: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // 判断是否为自定义错误
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(config.app.env === 'development' && { stack: err.stack }),
    });
    return;
  }

  // 处理其他类型的错误
  let statusCode = 500;
  let message = '服务器内部错误';

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的Token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token已过期';
  }

  // 数据库错误
  if (err.name === 'DatabaseError') {
    statusCode = 500;
    message = '数据库错误';
  }

  // 响应错误
  res.status(statusCode).json({
    code: statusCode,
    message,
    ...(config.app.env === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
}

/**
 * 404错误处理中间件
 *
 * 处理未匹配的路由
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 404,
    message: '请求的资源不存在',
    path: req.url,
    method: req.method,
  });
}

/**
 * 异步错误捕获包装器
 *
 * 包装异步路由处理器，自动捕获并传递错误
 *
 * @example
 * ```typescript
 * app.get('/api/users', asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json({ users });
 * }));
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
