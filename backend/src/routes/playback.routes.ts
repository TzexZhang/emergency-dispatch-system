/**
 * ============================================
 * 轨迹回放路由
 * ============================================
 */

import { Router } from 'express';
import { PlaybackController } from '@controllers/playback.controller';

const router = Router();
const playbackController = new PlaybackController();

router.get('/trajectory', playbackController.getTrajectory);
router.get('/heatmap', playbackController.getHeatmap);
router.get('/timeline', playbackController.getTimeline);

export default router;
