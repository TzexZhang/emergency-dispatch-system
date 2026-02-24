/**
 * ============================================
 * 空间分析路由
 * ============================================
 *
 * 功能说明：
 * - 等时圈计算（集成GraphHopper）
 * - 缓冲区分析
 * - 范围内要素查询
 * - 距离计算
 *
 * @author Emergency Dispatch Team
 */

import { Router } from 'express';
import { SpatialController } from '@controllers/spatial.controller';

const router = Router();
const spatialController = new SpatialController();

/**
 * POST /api/v1/spatial/isochrone
 * 生成等时圈
 *
 * Request Body:
 * {
 *   "lng": 116.404,
 *   "lat": 39.915,
 *   "minutes": [5, 10, 15],
 *   "profile": "car"
 * }
 */
router.post('/isochrone', spatialController.isochrone);

/**
 * POST /api/v1/spatial/buffer
 * 生成缓冲区
 *
 * Request Body:
 * {
 *   "lng": 116.404,
 *   "lat": 39.915,
 *   "radius": 1000,
 *   "rings": 3
 * }
 */
router.post('/buffer', spatialController.buffer);

/**
 * POST /api/v1/spatial/within
 * 范围内要素查询
 *
 * Request Body:
 * {
 *   "polygon": [[lng, lat], ...],
 *   "type": "resource",
 *   "buffer": 100
 * }
 */
router.post('/within', spatialController.within);

/**
 * POST /api/v1/spatial/distance
 * 距离计算
 *
 * Request Body:
 * {
 *   "from": [lng, lat],
 *   "to": [lng, lat]
 * }
 */
router.post('/distance', spatialController.distance);

export default router;
