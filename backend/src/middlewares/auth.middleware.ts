/**
 * ============================================
 * JWT认证中间件
 * ============================================
 *
 * 功能说明：
 * - 验证JWT Token
 * - 解析用户信息
 * - 检查Token过期时间
 * - 处理Token刷新
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@utils/logger';
import { config } from '@utils/config';

/**
 * 扩展Express Request接口，添加user属性
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userName: string;
        role: string;
        departmentId?: string;
      };
    }
  }
}

/**
 * JWT认证中间件
 *
 * 验证请求头中的Bearer Token
 *
 * @example
 * ```typescript
 * app.get('/api/protected', authMiddleware, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // 从请求头获取Token
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        code: 401,
        message: '未提供认证Token',
      });
      return;
    }

    // 提取Bearer Token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        code: 401,
        message: 'Token格式错误',
      });
      return;
    }

    const token = parts[1];

    // 验证Token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // 附加用户信息到请求对象
    req.user = {
      userId: decoded.userId,
      userName: decoded.userName,
      role: decoded.role,
      departmentId: decoded.departmentId,
    };

    next();
  } catch (err: any) {
    // Token过期
    if (err.name === 'TokenExpiredError') {
      logger.warn(`Token已过期: ${err.expiredAt}`);
      res.status(401).json({
        code: 401,
        message: 'Token已过期',
        expiredAt: err.expiredAt,
      });
      return;
    }

    // Token无效
    logger.error(`Token验证失败: ${err.message}`);
    res.status(401).json({
      code: 401,
      message: '无效的Token',
    });
    return;
  }
}

/**
 * 角色权限检查中间件工厂函数
 *
 * @param allowedRoles - 允许的角色列表
 * @returns 中间件函数
 *
 * @example
 * ```typescript
 * // 仅允许管理员访问
 * app.get('/api/admin', authMiddleware, checkRole(['admin']), handler);
 *
 * // 允许管理员和调度员访问
 * app.post('/api/dispatch', authMiddleware, checkRole(['admin', 'dispatcher']), handler);
 * ```
 */
export function checkRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: '未认证',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `权限拒绝: 用户 ${req.user.userName} (${req.user.role}) 尝试访问需要 ${allowedRoles.join(', ')} 角色的资源`
      );
      res.status(403).json({
        code: 403,
        message: '权限不足',
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

/**
 * 可选认证中间件
 *
 * 如果提供了Token则验证，但不强制要求
 * 适用于既支持登录又支持匿名访问的接口
 *
 * @example
 * ```typescript
 * app.get('/api/data', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     res.json({ data: personalizedData });
 *   } else {
 *     res.json({ data: publicData });
 *   }
 * });
 * ```
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      req.user = {
        userId: decoded.userId,
        userName: decoded.userName,
        role: decoded.role,
        departmentId: decoded.departmentId,
      };
    }

    next();
  } catch (err) {
    // 可选认证失败不阻止请求继续
    next();
  }
}

export default authMiddleware;
