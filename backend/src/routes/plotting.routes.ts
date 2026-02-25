/**
 * ============================================
 * 战术标绘路由
 * ============================================
 *
 * 功能说明：
 * - 标绘列表查询
 * - 标绘详情查询
 * - 创建标绘
 * - 更新标绘
 * - 删除标绘
 * - 按事件查询标绘
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { PlottingController } from '@controllers/plotting.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router = Router();
const plottingController = new PlottingController();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/v1/plotting
 * 获取标绘列表
 *
 * Query Params:
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认10）
 * - incidentId: 事件ID筛选
 * - type: 标绘类型筛选
 */
router.get('/', plottingController.getList);

/**
 * GET /api/v1/plotting/incident/:incidentId
 * 按事件查询标绘
 */
router.get('/incident/:incidentId', plottingController.getByIncident);

/**
 * GET /api/v1/plotting/:id
 * 获取标绘详情
 */
router.get('/:id', plottingController.getDetail);

/**
 * POST /api/v1/plotting
 * 创建标绘
 */
router.post('/', plottingController.create);

/**
 * PUT /api/v1/plotting/:id
 * 更新标绘
 */
router.put('/:id', plottingController.update);

/**
 * DELETE /api/v1/plotting/:id
 * 删除标绘
 */
router.delete('/:id', plottingController.delete);

export default router;
