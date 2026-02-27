/**
 * ============================================
 * 调度任务控制器
 * ============================================
 *
 * 功能说明：
 * - 任务列表查询
 * - 任务详情查询
 * - 创建调度任务
 * - 更新任务状态
 * - 取消任务
 * - 任务分配
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@utils/db';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError } from '@middlewares/error.middleware';

/**
 * 调度任务控制器类
 */
export class DispatchController {
  /**
   * 获取任务列表
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        pageSize = '10',
        status,
        priority,
        incidentId,
      } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const offset = (pageNum - 1) * pageSizeNum;

      // 构建查询条件
      const conditions: string[] = ['d.deleted_at IS NULL'];
      const params: any[] = [];

      if (status) {
        conditions.push('d.task_status = ?');
        params.push(status);
      }

      if (priority) {
        conditions.push('d.priority = ?');
        params.push(priority);
      }

      if (incidentId) {
        conditions.push('d.incident_id = ?');
        params.push(incidentId);
      }

      const whereClause = conditions.join(' AND ');

      // 查询总数
      const countResult = await query<any[]>(
        `SELECT COUNT(*) as total FROM t_dispatch_task d WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 查询列表
      const tasks = await query<any[]>(
        `SELECT
          d.id,
          d.incident_id as incidentId,
          i.title as incidentTitle,
          d.task_type as taskType,
          d.priority,
          d.task_status as status,
          d.resource_id as resourceId,
          r.resource_name as resourceName,
          d.dispatcher_id as dispatcherId,
          dispatcher.username as dispatcherName,
          d.route_geojson as routeGeojson,
          d.estimated_duration as estimatedDuration,
          d.estimated_arrival as estimatedArrival,
          d.actual_arrival as actualArrival,
          d.notes,
          d.completed_at as completedAt,
          d.created_at as createdAt,
          d.updated_at as updatedAt
         FROM t_dispatch_task d
         LEFT JOIN t_incident i ON d.incident_id = i.id
         LEFT JOIN t_resource r ON d.resource_id = r.id
         LEFT JOIN t_user dispatcher ON d.dispatcher_id = dispatcher.id
         WHERE ${whereClause}
         ORDER BY d.created_at DESC
         LIMIT ${pageSizeNum} OFFSET ${offset}`,
        params
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          list: tasks,
          total,
          page: pageNum,
          pageSize: pageSizeNum,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 获取任务详情
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getTaskDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const tasks = await query<any[]>(
        `SELECT
          d.id,
          d.incident_id,
          i.title as incident_title,
          d.task_type,
          d.priority,
          d.task_status as status,
          d.resource_id,
          r.resource_name as resource_name,
          rt.type_name as resource_type,
          d.dispatcher_id,
          dispatcher.username as dispatcher_name,
          d.route_geojson,
          d.estimated_duration,
          d.estimated_arrival,
          d.actual_arrival,
          d.notes,
          d.completed_at,
          d.created_at,
          d.updated_at
         FROM t_dispatch_task d
         LEFT JOIN t_incident i ON d.incident_id = i.id
         LEFT JOIN t_resource r ON d.resource_id = r.id
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         LEFT JOIN t_user dispatcher ON d.dispatcher_id = dispatcher.id
         WHERE d.id = ? AND d.deleted_at IS NULL`,
        [id]
      );

      if (tasks.length === 0) {
        throw new NotFoundError('任务不存在');
      }

      res.json({
        code: 200,
        message: 'success',
        data: tasks[0],
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 创建调度任务
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new ValidationError('未认证');
      }

      const {
        incidentId,
        taskType,
        priority = 0,
        resourceId,
        routeGeojson,
        estimatedDuration,
        notes,
      } = req.body;

      // 参数验证
      if (!incidentId) {
        throw new ValidationError('事件ID不能为空');
      }

      if (!resourceId) {
        throw new ValidationError('资源ID不能为空');
      }

      const taskId = uuidv4();

      await query(
        `INSERT INTO t_dispatch_task (
          id, incident_id, task_type, task_status, priority,
          resource_id, dispatcher_id, route_geojson, estimated_duration, notes, created_at
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW())`,
        [
          taskId,
          incidentId,
          taskType || 'emergency',
          priority,
          resourceId,
          req.user.userId,
          routeGeojson ? JSON.stringify(routeGeojson) : null,
          estimatedDuration || null,
          notes || null,
        ]
      );

      logger.info(`用户 ${req.user.userName} 创建调度任务: ${taskId}`);

      res.json({
        code: 200,
        message: '创建成功',
        data: { id: taskId },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 更新任务状态
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      // 检查任务是否存在
      const tasks = await query<any[]>(
        'SELECT id, status FROM t_dispatch_task WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (tasks.length === 0) {
        throw new NotFoundError('任务不存在');
      }

      const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('无效的任务状态');
      }

      // 构建更新SQL
      const updates: string[] = ['task_status = ?', 'updated_at = NOW()'];
      const values: any[] = [status];

      // 如果状态变为 completed，记录到达时间和完成时间
      if (status === 'completed' && tasks[0].status !== 'completed') {
        updates.push('actual_arrival = NOW()');
        updates.push('completed_at = NOW()');
      }

      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
      }

      values.push(id);

      await query(
        `UPDATE t_dispatch_task SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`任务 ${id} 状态更新为: ${status}`);

      res.json({
        code: 200,
        message: '状态更新成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 更新任务
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        priority,
        resourceId,
        routeGeojson,
        estimatedDuration,
        notes,
      } = req.body;

      // 检查任务是否存在
      const tasks = await query<any[]>(
        'SELECT id FROM t_dispatch_task WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (tasks.length === 0) {
        throw new NotFoundError('任务不存在');
      }

      // 构建更新SQL
      const updates: string[] = [];
      const values: any[] = [];

      if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
      }

      if (resourceId !== undefined) {
        updates.push('resource_id = ?');
        values.push(resourceId);
      }

      if (routeGeojson !== undefined) {
        updates.push('route_geojson = ?');
        values.push(routeGeojson ? JSON.stringify(routeGeojson) : null);
      }

      if (estimatedDuration !== undefined) {
        updates.push('estimated_duration = ?');
        values.push(estimatedDuration);
      }

      if (notes !== undefined) {
        updates.push('notes = ?');
        values.push(notes);
      }

      if (updates.length === 0) {
        throw new ValidationError('没有要更新的字段');
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await query(
        `UPDATE t_dispatch_task SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`任务 ${id} 更新成功`);

      res.json({
        code: 200,
        message: '更新成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 取消任务
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public cancelTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 检查任务是否存在
      const tasks = await query<any[]>(
        'SELECT id, status FROM t_dispatch_task WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (tasks.length === 0) {
        throw new NotFoundError('任务不存在');
      }

      if (tasks[0].status === 'completed') {
        throw new ValidationError('已完成的任务不能取消');
      }

      if (tasks[0].status === 'cancelled') {
        throw new ValidationError('任务已取消');
      }

      await query(
        `UPDATE t_dispatch_task SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      logger.info(`任务 ${id} 已取消`);

      res.json({
        code: 200,
        message: '任务已取消',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 删除任务（软删除）
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 检查任务是否存在
      const tasks = await query<any[]>(
        'SELECT id FROM t_dispatch_task WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (tasks.length === 0) {
        throw new NotFoundError('任务不存在');
      }

      await query(
        'UPDATE t_dispatch_task SET deleted_at = NOW() WHERE id = ?',
        [id]
      );

      logger.info(`任务 ${id} 已删除`);

      res.json({
        code: 200,
        message: '删除成功',
      });
    } catch (error) {
      throw error;
    }
  };
}

export default DispatchController;
