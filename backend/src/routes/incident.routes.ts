/**
 * ============================================
 * 事件管理路由
 * ============================================
 */

import { Router } from 'express';
import { IncidentController } from '@controllers/incident.controller';

const router = Router();
const incidentController = new IncidentController();

router.get('/', incidentController.getList);
router.get('/:id', incidentController.getDetail);
router.post('/', incidentController.create);
router.put('/:id', incidentController.update);
router.post('/:id/close', incidentController.close);

export default router;
