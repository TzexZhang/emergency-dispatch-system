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
          d.title,
          d.description,
          d.priority,
          d.task_status as status,
          d.resource_id as resourceId,
          r.name as resourceName,
          d.assigned_to as assignedTo,
          assignee.username as assigneeName,
          d.created_by as createdBy,
          creator.username as creatorName,
          d.scheduled_start as scheduledStart,
          d.scheduled_end as scheduledEnd,
          d.actual_start as actualStart,
          d.actual_end as actualEnd,
          d.created_at as createdAt,
          d.updated_at as updatedAt
         FROM t_dispatch_task d
         LEFT JOIN t_incident i ON d.incident_id = i.id
         LEFT JOIN t_resource r ON d.resource_id = r.id
         LEFT JOIN t_user assignee ON d.assigned_to = assignee.id
         LEFT JOIN t_user creator ON d.created_by = creator.id
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
          d.title,
          d.description,
          d.priority,
          d.task_status as status,
          d.resource_id,
          r.name as resource_name,
          r.type as resource_type,
          d.assigned_to,
          assignee.username as assignee_name,
          assignee.real_name as assignee_real_name,
          d.created_by,
          creator.username as creator_name,
          d.scheduled_start,
          d.scheduled_end,
          d.actual_start,
          d.actual_end,
          d.notes,
          d.created_at,
          d.updated_at
         FROM t_dispatch_task d
         LEFT JOIN t_incident i ON d.incident_id = i.id
         LEFT JOIN t_resource r ON d.resource_id = r.id
         LEFT JOIN t_user assignee ON d.assigned_to = assignee.id
         LEFT JOIN t_user creator ON d.created_by = creator.id
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
        title,
        description,
        priority = 'medium',
        resourceId,
        assignedTo,
        scheduledStart,
        scheduledEnd,
      } = req.body;

      // 参数验证
      if (!title) {
        throw new ValidationError('任务标题不能为空');
      }

      const taskId = uuidv4();

      await query(
        `INSERT INTO t_dispatch_task (
          id, incident_id, task_type, title, description, priority, status,
          resource_id, assigned_to, created_by,
          scheduled_start, scheduled_end, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW())`,
        [
          taskId,
          incidentId || null,
          taskType || 'emergency',
          title,
          description || null,
          priority,
          resourceId || null,
          assignedTo || null,
          req.user.userId,
          scheduledStart || null,
          scheduledEnd || null,
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
      const updates: string[] = ['status = ?', 'updated_at = NOW()'];
      const values: any[] = [status];

      // 如果状态变为 in_progress，记录开始时间
      if (status === 'in_progress' && tasks[0].status !== 'in_progress') {
        updates.push('actual_start = NOW()');
      }

      // 如果状态变为 completed，记录结束时间
      if (status === 'completed') {
        updates.push('actual_end = NOW()');
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
        title,
        description,
        priority,
        assignedTo,
        resourceId,
        scheduledStart,
        scheduledEnd,
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

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (priority !== undefined) {
        updates.push('priority = ?');
        values.push(priority);
      }

      if (assignedTo !== undefined) {
        updates.push('assigned_to = ?');
        values.push(assignedTo);
      }

      if (resourceId !== undefined) {
        updates.push('resource_id = ?');
        values.push(resourceId);
      }

      if (scheduledStart !== undefined) {
        updates.push('scheduled_start = ?');
        values.push(scheduledStart);
      }

      if (scheduledEnd !== undefined) {
        updates.push('scheduled_end = ?');
        values.push(scheduledEnd);
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
