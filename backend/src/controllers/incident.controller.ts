/**
 * ============================================
 * 事件管理控制器
 * ============================================
 *
 * 功能说明：
 * - 事件列表查询（分页、筛选）
 * - 事件详情查询
 * - 创建事件
 * - 更新事件
 * - 删除事件（软删除）
 * - 关闭事件
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@utils/db';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError } from '@middlewares/error.middleware';

/**
 * 事件管理控制器类
 */
export class IncidentController {
  /**
   * 获取事件列表
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getList = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        pageSize = '10',
        type,
        status,
        level,
        keyword,
      } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const offset = (pageNum - 1) * pageSizeNum;

      // 构建查询条件（使用正确的数据库字段名）
      const conditions: string[] = ['i.deleted_at IS NULL'];
      const params: any[] = [];

      if (type) {
        conditions.push('i.incident_type = ?');
        params.push(type);
      }

      if (status) {
        conditions.push('i.incident_status = ?');
        params.push(status);
      }

      if (level) {
        conditions.push('i.incident_level = ?');
        params.push(level);
      }

      if (keyword) {
        conditions.push('(i.title LIKE ? OR i.description LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      }

      const whereClause = conditions.join(' AND ');

      // 查询总数
      const countResult = await query<any[]>(
        `SELECT COUNT(*) as total FROM t_incident i WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 查询列表（使用 AS 别名映射字段名）
      const incidents = await query<any[]>(
        `SELECT
          i.id,
          i.incident_type as type,
          i.title,
          i.description,
          i.incident_level as level,
          i.incident_status as status,
          i.location,
          i.latitude,
          i.longitude,
          i.reported_by as reportedBy,
          reporter.username as reporterName,
          i.handler_id as handlerId,
          handler.username as assigneeName,
          i.reported_at as reportedAt,
          i.resolved_at as resolvedAt,
          i.created_at as createdAt,
          i.updated_at as updatedAt
         FROM t_incident i
         LEFT JOIN t_user reporter ON i.reported_by = reporter.id
         LEFT JOIN t_user handler ON i.handler_id = handler.id
         WHERE ${whereClause}
         ORDER BY i.created_at DESC
         LIMIT ${pageSizeNum} OFFSET ${offset}`,
        params
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          list: incidents,
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
   * 获取事件详情
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const incidents = await query<any[]>(
        `SELECT
          i.id,
          i.incident_type as type,
          i.title,
          i.description,
          i.incident_level as level,
          i.incident_status as status,
          i.location,
          i.latitude,
          i.longitude,
          i.reported_by,
          reporter.username as reporter_name,
          reporter.real_name as reporter_real_name,
          i.handler_id,
          handler.username as handler_name,
          handler.real_name as handler_real_name,
          i.reported_at,
          i.resolved_at,
          i.created_at,
          i.updated_at
         FROM t_incident i
         LEFT JOIN t_user reporter ON i.reported_by = reporter.id
         LEFT JOIN t_user handler ON i.handler_id = handler.id
         WHERE i.id = ? AND i.deleted_at IS NULL`,
        [id]
      );

      if (incidents.length === 0) {
        throw new NotFoundError('事件不存在');
      }

      res.json({
        code: 200,
        message: 'success',
        data: incidents[0],
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 创建事件
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new ValidationError('未认证');
      }

      const {
        type,
        title,
        description,
        level,
        location,
        latitude,
        longitude,
        resolvedAt,
      } = req.body;

      // 参数验证
      if (!type || !title) {
        throw new ValidationError('事件类型和标题不能为空');
      }

      const incidentId = uuidv4();

      await query(
        `INSERT INTO t_incident (
          id, incident_type, title, description, incident_level, incident_status,
          location, latitude, longitude,
          reported_by, reported_at, resolved_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
        [
          incidentId,
          type,
          title,
          description || null,
          level || 'medium',
          location || null,
          latitude || null,
          longitude || null,
          req.user.userId,
          resolvedAt || null,
        ]
      );

      logger.info(`用户 ${req.user.userName} 创建事件: ${incidentId}`);

      res.json({
        code: 200,
        message: '创建成功',
        data: { id: incidentId },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 更新事件
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        type,
        title,
        description,
        level,
        status,
        location,
        latitude,
        longitude,
        handlerId,
      } = req.body;

      // 检查事件是否存在
      const incidents = await query<any[]>(
        'SELECT id FROM t_incident WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (incidents.length === 0) {
        throw new NotFoundError('事件不存在');
      }

      // 构建更新SQL（使用正确的字段名）
      const updates: string[] = [];
      const values: any[] = [];

      if (type !== undefined) {
        updates.push('incident_type = ?');
        values.push(type);
      }

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (level !== undefined) {
        updates.push('incident_level = ?');
        values.push(level);
      }

      if (status !== undefined) {
        updates.push('incident_status = ?');
        values.push(status);
      }

      if (location !== undefined) {
        updates.push('location = ?');
        values.push(location);
      }

      if (latitude !== undefined) {
        updates.push('latitude = ?');
        values.push(latitude);
      }

      if (longitude !== undefined) {
        updates.push('longitude = ?');
        values.push(longitude);
      }

      if (handlerId !== undefined) {
        updates.push('handler_id = ?');
        values.push(handlerId);
      }

      if (updates.length === 0) {
        throw new ValidationError('没有要更新的字段');
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await query(
        `UPDATE t_incident SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`事件 ${id} 更新成功`);

      res.json({
        code: 200,
        message: '更新成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 删除事件（软删除）
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 检查事件是否存在
      const incidents = await query<any[]>(
        'SELECT id FROM t_incident WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (incidents.length === 0) {
        throw new NotFoundError('事件不存在');
      }

      await query(
        'UPDATE t_incident SET deleted_at = NOW() WHERE id = ?',
        [id]
      );

      logger.info(`事件 ${id} 已删除`);

      res.json({
        code: 200,
        message: '删除成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 关闭事件
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public close = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 检查事件是否存在
      const incidents = await query<any[]>(
        'SELECT id, incident_status FROM t_incident WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (incidents.length === 0) {
        throw new NotFoundError('事件不存在');
      }

      if (incidents[0].incident_status === 'closed') {
        throw new ValidationError('事件已关闭');
      }

      await query(
        `UPDATE t_incident SET incident_status = 'closed', resolved_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [id]
      );

      logger.info(`事件 ${id} 已关闭`);

      res.json({
        code: 200,
        message: '事件已关闭',
      });
    } catch (error) {
      throw error;
    }
  };
}

export default IncidentController;
