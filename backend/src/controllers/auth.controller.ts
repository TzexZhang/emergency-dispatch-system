/**
 * ============================================
 * 认证控制器
 * ============================================
 *
 * 功能说明：
 * - 用户登录/登出
 * - JWT Token生成和验证
 * - Token刷新
 * - 获取用户信息
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@utils/db';
import { config } from '@utils/config';
import { logger } from '@utils/logger';
import { NotFoundError, UnauthorizedError, ValidationError } from '@middlewares/error.middleware';

/**
 * 认证控制器类
 */
export class AuthController {
  /**
   * 用户登录
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      // 参数验证
      if (!username || !password) {
        throw new ValidationError('用户名和密码不能为空');
      }

      // 查询用户
      const users = await query<any[]>(
        `SELECT
          id, username, password_hash, real_name, email, avatar,
          role, department_id, status
         FROM t_user
         WHERE username = ? AND deleted_at IS NULL`,
        [username]
      );

      if (users.length === 0) {
        throw new UnauthorizedError('用户名或密码错误');
      }

      const user = users[0];

      // 检查用户状态
      if (user.status !== 'active') {
        throw new UnauthorizedError('账户已被禁用');
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('用户名或密码错误');
      }

      // 生成Token
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // 更新最后登录时间
      await query(
        `UPDATE t_user SET last_login_at = NOW() WHERE id = ?`,
        [user.id]
      );

      logger.info(`用户登录成功: ${user.username}`);

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          refreshToken,
          user: {
            userId: user.id,
            username: user.username,
            realName: user.real_name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            departmentId: user.department_id,
            status: user.status,
            lastLoginAt: user.last_login_at,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 用户登出
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public logout = async (_req: Request, res: Response): Promise<void> => {
    // TODO: 将Token加入黑名单（Redis）
    // await redis.set(`blacklist:${token}`, '1', 'EX', expiresIn);

    res.json({
      code: 200,
      message: '登出成功',
    });
  };

  /**
   * 刷新Token
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('refreshToken不能为空');
      }

      // 验证Refresh Token
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.refreshSecret
      ) as any;

      // 查询用户
      const users = await query<any[]>(
        `SELECT id, username, real_name, avatar, role, department_id, status
         FROM t_user
         WHERE id = ? AND status = 'active' AND deleted_at IS NULL`,
        [decoded.userId]
      );

      if (users.length === 0) {
        throw new UnauthorizedError('用户不存在或已被禁用');
      }

      const user = users[0];

      // 生成新的Token
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // 更新user对象以包含avatar
      user.avatar = user.avatar || null;

      res.json({
        code: 200,
        message: 'Token刷新成功',
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      throw new UnauthorizedError('refreshToken无效或已过期');
    }
  };

  /**
   * 获取当前用户信息
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('未认证');
    }

    // 查询用户完整信息
    const users = await query<any[]>(
      `SELECT
        u.id,
        u.username,
        u.real_name,
        u.phone,
        u.email,
        u.avatar,
        u.role,
        u.department_id,
        d.name as department_name,
        u.status,
        u.last_login_at
       FROM t_user u
       LEFT JOIN t_department d ON u.department_id = d.id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.user.userId]
    );

    if (users.length === 0) {
      throw new NotFoundError('用户不存在');
    }

    const user = users[0];

    res.json({
      code: 200,
      message: 'success',
      data: {
        userId: user.id,
        username: user.username,
        realName: user.real_name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        departmentId: user.department_id,
        departmentName: user.department_name,
        status: user.status,
        lastLoginAt: user.last_login_at,
      },
    });
  };

  /**
   * 用户注册
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, realName, phone, email, role = 'operator' } = req.body;

      // 参数验证
      if (!username || !password) {
        res.status(400).json({
          code: 400,
          message: '用户名和密码不能为空',
        });
        return;
      }

      // 验证角色
      const validRoles = ['admin', 'operator', 'dispatcher', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({
          code: 400,
          message: '无效的角色类型',
        });
        return;
      }

      // 检查用户名是否已存在
      const existingUsers = await query<any[]>(
        'SELECT id FROM t_user WHERE username = ? AND deleted_at IS NULL',
        [username]
      );

      if (existingUsers.length > 0) {
        res.status(409).json({
          code: 409,
          message: '用户名已存在',
        });
        return;
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 生成用户ID
      const userId = uuidv4();

      // 插入用户记录
      await query(
        `INSERT INTO t_user (id, username, password_hash, real_name, phone, email, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [userId, username, passwordHash, realName || null, phone || null, email || null, role]
      );

      logger.info(`新用户注册成功: ${username}`);

      res.json({
        code: 200,
        message: '注册成功',
        data: {
          userId,
          username,
          role,
        },
      });
    } catch (error: any) {
      logger.error(`用户注册失败: ${error.message}`, error);
      res.status(500).json({
        code: 500,
        message: '注册失败',
        error: error.message,
      });
    }
  };

  /**
   * 上传头像
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('未认证');
      }

      if (!req.file) {
        throw new ValidationError('请选择要上传的头像文件');
      }

      // 获取文件路径
      const fileName = req.file.filename;
      const avatarUrl = `/uploads/avatars/${fileName}`;

      // 更新用户头像
      await query(
        'UPDATE t_user SET avatar = ? WHERE id = ?',
        [avatarUrl, req.user.userId]
      );

      logger.info(`用户 ${req.user.userName} 上传头像成功: ${avatarUrl}`);

      res.json({
        code: 200,
        message: '头像上传成功',
        data: {
          avatarUrl,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 更新个人信息
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('未认证');
      }

      const { realName, phone, email } = req.body;

      // 构建更新SQL（只更新提供的字段）
      const updates: string[] = [];
      const values: any[] = [];

      if (realName !== undefined) {
        updates.push('real_name = ?');
        values.push(realName);
      }

      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone);
      }

      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }

      if (updates.length === 0) {
        throw new ValidationError('没有要更新的字段');
      }

      values.push(req.user.userId);

      await query(
        `UPDATE t_user SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`用户 ${req.user.userName} 更新个人信息成功`);

      // 查询更新后的用户信息
      const users = await query<any[]>(
        `SELECT id, username, real_name, phone, email, avatar, role, department_id
         FROM t_user WHERE id = ?`,
        [req.user.userId]
      );

      const user = users[0];

      res.json({
        code: 200,
        message: '更新成功',
        data: {
          userId: user.id,
          username: user.username,
          realName: user.real_name,
          phone: user.phone,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 生成访问Token
   *
   * @param user - 用户信息
   * @returns JWT Token
   */
  private generateToken(user: any): string {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      departmentId: user.department_id,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });
  }

  /**
   * 生成刷新Token
   *
   * @param user - 用户信息
   * @returns Refresh Token
   */
  private generateRefreshToken(user: any): string {
    const payload = {
      userId: user.id,
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });
  }
}

export default AuthController;
