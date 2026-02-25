/**
 * ============================================
 * 战术标绘控制器
 * ============================================
 *
 * 功能说明：
 * - 标绘列表查询
 * - 标绘详情查询
 * - 创建标绘
 * - 更新标绘
 * - 删除标绘
 * - 按事件查询标绘
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@utils/db';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError } from '@middlewares/error.middleware';

/**
 * 战术标绘控制器类
 */
export class PlottingController {
  /**
   * 获取标绘列表
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getList = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        pageSize = '10',
        incidentId,
        type,
      } = req.query;

      const pageNum = parseInt(page as string);
      const pageSizeNum = parseInt(pageSize as string);
      const offset = (pageNum - 1) * pageSizeNum;

      // 构建查询条件
      const conditions: string[] = ['p.deleted_at IS NULL'];
      const params: any[] = [];

      if (incidentId) {
        conditions.push('p.incident_id = ?');
        params.push(incidentId);
      }

      if (type) {
        conditions.push('p.type = ?');
        params.push(type);
      }

      const whereClause = conditions.join(' AND ');

      // 查询总数
      const countResult = await query<any[]>(
        `SELECT COUNT(*) as total FROM t_plotting p WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 查询列表
      const plottings = await query<any[]>(
        `SELECT
          p.id,
          p.incident_id,
          i.title as incident_title,
          p.plotting_type as type,
          p.plotting_name as title,
          p.description,
          p.geometry,
          p.style,
          p.created_by,
          creator.username as creator_name,
          p.created_at,
          p.updated_at
         FROM t_plotting p
         LEFT JOIN t_incident i ON p.incident_id = i.id
         LEFT JOIN t_user creator ON p.created_by = creator.id
         WHERE ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT ${pageSizeNum} OFFSET ${offset}`,
        params
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          list: plottings,
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
   * 获取标绘详情
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const plottings = await query<any[]>(
        `SELECT
          p.id,
          p.incident_id,
          i.title as incident_title,
          p.type,
          p.title,
          p.description,
          p.geometry,
          p.style,
          p.created_by,
          creator.username as creator_name,
          creator.real_name as creator_real_name,
          p.created_at,
          p.updated_at
         FROM t_plotting p
         LEFT JOIN t_incident i ON p.incident_id = i.id
         LEFT JOIN t_user creator ON p.created_by = creator.id
         WHERE p.id = ? AND p.deleted_at IS NULL`,
        [id]
      );

      if (plottings.length === 0) {
        throw new NotFoundError('标绘不存在');
      }

      res.json({
        code: 200,
        message: 'success',
        data: plottings[0],
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 创建标绘
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
        incidentId,
        type,
        title,
        description,
        geometry,
        style,
      } = req.body;

      // 参数验证
      if (!type || !geometry) {
        throw new ValidationError('标绘类型和几何数据不能为空');
      }

      // 验证标绘类型
      const validTypes = ['point', 'line', 'polygon', 'circle', 'rectangle', 'arrow', 'text'];
      if (!validTypes.includes(type)) {
        throw new ValidationError('无效的标绘类型');
      }

      const plottingId = uuidv4();

      await query(
        `INSERT INTO t_plotting (
          id, incident_id, plotting_type, plotting_name, description, geometry, style, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          plottingId,
          incidentId || null,
          type,
          title || null,
          description || null,
          JSON.stringify(geometry),
          style ? JSON.stringify(style) : null,
          req.user.userId,
        ]
      );

      logger.info(`用户 ${req.user.userName} 创建标绘: ${plottingId}`);

      res.json({
        code: 200,
        message: '创建成功',
        data: { id: plottingId },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 更新标绘
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        geometry,
        style,
      } = req.body;

      // 检查标绘是否存在
      const plottings = await query<any[]>(
        'SELECT id FROM t_plotting WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (plottings.length === 0) {
        throw new NotFoundError('标绘不存在');
      }

      // 构建更新SQL
      const updates: string[] = [];
      const values: any[] = [];

      if (title !== undefined) {
        updates.push('plotting_name = ?');
        values.push(title);
      }

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (geometry !== undefined) {
        updates.push('geometry = ?');
        values.push(JSON.stringify(geometry));
      }

      if (style !== undefined) {
        updates.push('style = ?');
        values.push(JSON.stringify(style));
      }

      if (updates.length === 0) {
        throw new ValidationError('没有要更新的字段');
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await query(
        `UPDATE t_plotting SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info(`标绘 ${id} 更新成功`);

      res.json({
        code: 200,
        message: '更新成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 删除标绘（软删除）
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 检查标绘是否存在
      const plottings = await query<any[]>(
        'SELECT id FROM t_plotting WHERE id = ? AND deleted_at IS NULL',
        [id]
      );

      if (plottings.length === 0) {
        throw new NotFoundError('标绘不存在');
      }

      await query(
        'UPDATE t_plotting SET deleted_at = NOW() WHERE id = ?',
        [id]
      );

      logger.info(`标绘 ${id} 已删除`);

      res.json({
        code: 200,
        message: '删除成功',
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 按事件查询标绘
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getByIncident = async (req: Request, res: Response): Promise<void> => {
    try {
      const { incidentId } = req.params;

      const plottings = await query<any[]>(
        `SELECT
          p.id,
          p.incident_id,
          p.type,
          p.title,
          p.description,
          p.geometry,
          p.style,
          p.created_by,
          creator.username as creator_name,
          p.created_at
         FROM t_plotting p
         LEFT JOIN t_user creator ON p.created_by = creator.id
         WHERE p.incident_id = ? AND p.deleted_at IS NULL
         ORDER BY p.created_at ASC`,
        [incidentId]
      );

      res.json({
        code: 200,
        message: 'success',
        data: plottings,
      });
    } catch (error) {
      throw error;
    }
  };
}

export default PlottingController;
