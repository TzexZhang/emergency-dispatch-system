/**
 * ============================================
 * 调度管理路由
 * ============================================
 */

import { Router } from 'express';
import { DispatchController } from '@controllers/dispatch.controller';

const router = Router();
const dispatchController = new DispatchController();

router.get('/tasks', dispatchController.getTasks);
router.post('/tasks', dispatchController.createTask);
router.put('/tasks/:id', dispatchController.updateTask);
router.post('/route', dispatchController.planRoute);

export default router;
