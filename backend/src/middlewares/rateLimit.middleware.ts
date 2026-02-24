/**
 * ============================================
 * 请求限流中间件
 * ============================================
 *
 * 功能说明：
 * - 基于IP的请求频率限制
 * - 防止接口滥用和DDoS攻击
 * - 支持自定义限流规则
 * - 内存存储（生产环境建议使用Redis）
 *
 * @author Emergency Dispatch Team
 */

import rateLimit from 'express-rate-limit';
import { config } from '@utils/config';

/**
 * 通用API限流器
 *
 * 限制: 15分钟内最多100个请求
 */
export const rateLimiter = rateLimit({
  windowMs: config.app.rateLimitWindowMs || 15 * 60 * 1000, // 15分钟
  max: config.app.rateLimitMaxRequests || 100,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
  },
  standardHeaders: true, // 返回标准的 `RateLimit-*` 头
  legacyHeaders: false, // 禁用 `X-RateLimit-*` 头

  // 跳过成功请求的计数（可选）
  skipSuccessfulRequests: false,

  // 自定义key生成器（基于IP）
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },

  // 跳过某些请求
  skip: (req) => {
    // 跳过健康检查
    if (req.path === '/health') {
      return true;
    }
    return false;
  },

  // 自定义处理器
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试',
      retryAfter: Math.round(
        (config.app.rateLimitWindowMs || 15 * 60 * 1000) / 1000
      ),
    });
  },
});

/**
 * 严格限流器
 *
 * 用于敏感操作，如登录、注册等
 * 限制: 15分钟内最多5个请求
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5,
  message: {
    code: 429,
    message: '操作过于频繁，请15分钟后再试',
  },
});

/**
 * API Key限流器
 *
 * 基于API Key的限流（适用于开放API）
 */
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 1000,
  keyGenerator: (req) => {
    return req.headers['x-api-key'] as string || req.ip;
  },
  message: {
    code: 429,
    message: 'API调用次数超限',
  },
});

export default {
  rateLimiter,
  strictRateLimiter,
  apiKeyRateLimiter,
};
