/**
 * ============================================
 * 资源管理路由
 * ============================================
 *
 * 功能说明：
 * - 资源列表查询
 * - 资源详情
 * - 资源增删改
 * - 附近资源查询
 * - 资源统计
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { ResourceController } from '@controllers/resource.controller';

const router: any = Router();
const resourceController = new ResourceController();

/**
 * GET /api/v1/resources
 * 获取资源列表
 *
 * Query Params:
 * - type: 资源类型
 * - status: 状态
 * - page: 页码
 * - pageSize: 每页数量
 */
router.get('/', resourceController.getList);

/**
 * GET /api/v1/resources/nearby
 * 查询附近资源
 *
 * Query Params:
 * - lng: 经度
 * - lat: 纬度
 * - radius: 半径（米）
 * - type: 资源类型
 */
router.get('/nearby', resourceController.getNearby);

/**
 * GET /api/v1/resources/stats
 * 资源统计
 */
router.get('/stats', resourceController.getStats);

/**
 * GET /api/v1/resources/types
 * 获取资源类型列表
 */
router.get('/types', resourceController.getTypes);

/**
 * POST /api/v1/resources
 * 创建资源
 */
router.post('/', resourceController.create);

/**
 * GET /api/v1/resources/:id
 * 获取资源详情
 * IMPORTANT: This route must come AFTER specific routes like /stats and /nearby
 */
router.get('/:id', resourceController.getDetail);

/**
 * PUT /api/v1/resources/:id
 * 更新资源
 */
router.put('/:id', resourceController.update);

/**
 * DELETE /api/v1/resources/:id
 * 删除资源
 */
router.delete('/:id', resourceController.delete);

export default router;
