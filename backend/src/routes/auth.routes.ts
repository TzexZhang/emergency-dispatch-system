/**
 * ============================================
 * 认证路由
 * ============================================
 *
 * 功能说明：
 * - 用户登录
 * - 用户登出
 * - Token刷新
 * - 获取当前用户信息
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { AuthController } from '@controllers/auth.controller';
import { strictRateLimiter } from '@middlewares/rateLimit.middleware';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/v1/auth/login
 * 用户登录
 *
 * Request Body:
 * {
 *   "username": "admin",
 *   "password": "admin123"
 * }
 *
 * Response:
 * {
 *   "code": 200,
 *   "message": "登录成功",
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIs...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "user": { ... }
 *   }
 * }
 */
router.post('/login', strictRateLimiter, authController.login);

/**
 * POST /api/v1/auth/logout
 * 用户登出
 */
router.post('/logout', authController.logout);

/**
 * POST /api/v1/auth/refresh
 * 刷新Token
 *
 * Request Body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /api/v1/auth/info
 * 获取当前用户信息
 * 需要认证
 */
router.get('/info', authController.getCurrentUser);

export default router;
