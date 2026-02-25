/**
 * ============================================
 * 轨迹回放路由
 * ============================================
 *
 * 功能说明：
 * - 查询轨迹数据
 * - 获取热力图数据
 * - 导出轨迹
 * - 轨迹统计分析
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { PlaybackController } from '@controllers/playback.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router = Router();
const playbackController = new PlaybackController();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/v1/playback/trajectory
 * 查询轨迹数据
 *
 * Query Params:
 * - resourceId: 资源ID（必填）
 * - startTime: 开始时间（必填）
 * - endTime: 结束时间（必填）
 */
router.get('/trajectory', playbackController.getTrajectory);

/**
 * GET /api/v1/playback/heatmap
 * 获取热力图数据
 *
 * Query Params:
 * - resourceId: 资源ID（必填）
 * - startTime: 开始时间（必填）
 * - endTime: 结束时间（必填）
 * - gridSize: 网格大小（可选）
 */
router.get('/heatmap', playbackController.getHeatmap);

/**
 * GET /api/v1/playback/export
 * 导出轨迹
 *
 * Query Params:
 * - resourceId: 资源ID（必填）
 * - startTime: 开始时间（必填）
 * - endTime: 结束时间（必填）
 * - format: 导出格式（json/geojson/csv，默认json）
 */
router.get('/export', playbackController.exportTrack);

/**
 * GET /api/v1/playback/stats
 * 获取轨迹统计信息
 *
 * Query Params:
 * - resourceId: 资源ID（必填）
 * - startTime: 开始时间（必填）
 * - endTime: 结束时间（必填）
 */
router.get('/stats', playbackController.getStats);

export default router;
