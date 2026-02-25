/**
 * ============================================
 * 事件管理路由
 * ============================================
 *
 * 功能说明：
 * - 事件列表查询
 * - 事件详情查询
 * - 创建事件
 * - 更新事件
 * - 删除事件
 * - 关闭事件
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { IncidentController } from '@controllers/incident.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router = Router();
const incidentController = new IncidentController();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/v1/incident
 * 获取事件列表
 *
 * Query Params:
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认10）
 * - type: 事件类型筛选
 * - status: 状态筛选
 * - level: 等级筛选
 * - keyword: 关键词搜索
 */
router.get('/', incidentController.getList);

/**
 * GET /api/v1/incident/:id
 * 获取事件详情
 */
router.get('/:id', incidentController.getDetail);

/**
 * POST /api/v1/incident
 * 创建事件
 */
router.post('/', incidentController.create);

/**
 * PUT /api/v1/incident/:id
 * 更新事件
 */
router.put('/:id', incidentController.update);

/**
 * DELETE /api/v1/incident/:id
 * 删除事件
 */
router.delete('/:id', incidentController.delete);

/**
 * POST /api/v1/incident/:id/close
 * 关闭事件
 */
router.post('/:id/close', incidentController.close);

export default router;
