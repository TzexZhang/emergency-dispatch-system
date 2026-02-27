/**
 * ============================================
 * 调度管理路由
 * ============================================
 *
 * 功能说明：
 * - 任务列表查询
 * - 任务详情查询
 * - 创建调度任务
 * - 更新任务
 * - 更新任务状态
 * - 取消任务
 * - 删除任务
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { DispatchController } from '@controllers/dispatch.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router: any = Router();
const dispatchController = new DispatchController();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/v1/dispatch/tasks
 * 获取任务列表
 *
 * Query Params:
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认10）
 * - status: 状态筛选
 * - priority: 优先级筛选
 * - incidentId: 事件ID筛选
 */
router.get('/tasks', dispatchController.getTasks);

/**
 * GET /api/v1/dispatch/tasks/:id
 * 获取任务详情
 */
router.get('/tasks/:id', dispatchController.getTaskDetail);

/**
 * POST /api/v1/dispatch/tasks
 * 创建调度任务
 */
router.post('/tasks', dispatchController.createTask);

/**
 * PUT /api/v1/dispatch/tasks/:id
 * 更新任务
 */
router.put('/tasks/:id', dispatchController.updateTask);

/**
 * PATCH /api/v1/dispatch/tasks/:id/status
 * 更新任务状态
 */
router.patch('/tasks/:id/status', dispatchController.updateTaskStatus);

/**
 * POST /api/v1/dispatch/tasks/:id/cancel
 * 取消任务
 */
router.post('/tasks/:id/cancel', dispatchController.cancelTask);

/**
 * DELETE /api/v1/dispatch/tasks/:id
 * 删除任务
 */
router.delete('/tasks/:id', dispatchController.deleteTask);

export default router;
