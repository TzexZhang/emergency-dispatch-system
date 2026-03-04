/**
 * ============================================
 * 资源管理控制器
 * ============================================
 *
 * 功能说明：
 * - 资源CRUD操作
 * - 附近资源查询（空间查询）
 * - 资源统计分析
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, insert, update } from '@utils/db';
import { NotFoundError, ValidationError } from '@middlewares/error.middleware';
import { logger } from '@utils/logger';
import { getWsGateway } from '@websocket/export';

/**
 * 资源控制器类
 */
export class ResourceController {
  /**
   * 获取资源列表
   */
  public getList = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        type,
        status,
        page = '1',
        pageSize = '20',
        departmentId,
      } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      const limit = parseInt(pageSize as string);

      // 构建查询条件
      let whereClause = 'WHERE r.deleted_at IS NULL';
      const params: any[] = [];

      if (type) {
        whereClause += ' AND rt.type_code = ?';
        params.push(type);
      }

      if (status) {
        whereClause += ' AND r.resource_status = ?';
        params.push(status);
      }

      if (departmentId) {
        whereClause += ' AND r.department_id = ?';
        params.push(departmentId);
      }

      // 查询总数
      const countResult = await query<any[]>(
        `SELECT COUNT(*) as total FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 查询列表
      // 注意: MySQL prepared statement 不支持 LIMIT/OFFSET 使用占位符
      // 需要直接将数值嵌入 SQL，并确保是有效的整数
      const safeLimit = Math.max(1, Math.min(1000, limit));
      const safeOffset = Math.max(0, offset);

      const resources = await query<any[]>(
        `SELECT
          r.id,
          r.resource_type_id AS resourceTypeId,
          r.resource_name AS resourceName,
          r.resource_code AS resourceCode,
          r.resource_status AS resourceStatus,
          r.longitude,
          r.latitude,
          r.speed,
          r.direction,
          r.properties,
          r.department_id AS departmentId,
          rt.type_code AS typeCode,
          rt.type_name AS typeName,
          rt.icon_url AS iconUrl,
          rt.color,
          d.name AS departmentName,
          r.created_at,
          r.updated_at AS updatedAt
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         LEFT JOIN t_department d ON r.department_id = d.id
         ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        params
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          list: resources,
          total,
          page: parseInt(page as string),
          pageSize: limit,
        },
      });
    } catch (error) {
      logger.error('获取资源列表失败:', error);
      throw error;
    }
  };

  /**
   * 获取资源详情
   */
  public getDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const resources = await query<any[]>(
        `SELECT
          r.*,
          rt.type_code,
          rt.type_name,
          rt.icon_url,
          rt.color,
          d.name as department_name
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         LEFT JOIN t_department d ON r.department_id = d.id
         WHERE r.id = ? AND r.deleted_at IS NULL`,
        [id]
      );

      if (resources.length === 0) {
        throw new NotFoundError('资源不存在');
      }

      res.json({
        code: 200,
        message: 'success',
        data: resources[0],
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 生成下一个资源编号
   * 格式: RES-YYYYMMDD-XXXXX (如 RES-20260303-00001)
   */
  private generateNextResourceCode = async (): Promise<string> => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RES-${dateStr}-`;

    // 查询当天最大编号
    const result = await query<any[]>(
      `SELECT resource_code FROM t_resource
       WHERE resource_code LIKE ?
       ORDER BY resource_code DESC
       LIMIT 1`,
      [`${prefix}%`]
    );

    if (result.length === 0) {
      return `${prefix}00001`;
    }

    const lastCode = result[0].resource_code;
    const lastNumber = parseInt(lastCode.slice(-5), 10);
    const nextNumber = lastNumber + 1;

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  };

  /**
   * 创建资源
   */
  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        resourceTypeId,
        resourceName,
        resourceCode: inputResourceCode,
        resourceStatus = 'online',
        longitude,
        latitude,
        altitude,
        speed,
        direction,
        properties,
        departmentId,
      } = req.body;

      // 参数验证
      if (!resourceTypeId || !resourceName || !longitude || !latitude) {
        throw new ValidationError('缺少必要参数');
      }

      const id = uuidv4();

      // 自动生成资源编号（如果未提供）
      const resourceCode = inputResourceCode || await this.generateNextResourceCode();

      await insert('t_resource', {
        id,
        resource_type_id: resourceTypeId,
        resource_name: resourceName,
        resource_code: resourceCode,
        resource_status: resourceStatus,
        longitude,
        latitude,
        altitude,
        speed,
        direction,
        properties: properties ? JSON.stringify(properties) : null,
        department_id: departmentId,
      });

      // 获取创建的资源详情
      const resource = await query<any[]>(
        `SELECT
          r.*,
          rt.type_code,
          rt.color
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         WHERE r.id = ?`,
        [id]
      );

      // 广播新资源创建事件
      if (resource.length > 0) {
        try {
          const wsGateway = getWsGateway();
          wsGateway.broadcastResourceUpdate({
            id: resource[0].id,
            status: resource[0].resource_status,
            lng: resource[0].longitude,
            lat: resource[0].latitude,
            properties: {
              resourceName: resource[0].resource_name,
              typeCode: resource[0].type_code,
              color: resource[0].color,
            },
          });
        } catch (wsError) {
          logger.warn('WebSocket推送资源创建失败:', wsError);
        }
      }

      logger.info(`创建资源成功: ${resourceName}`);

      res.status(201).json({
        code: 201,
        message: '创建成功',
        data: resource[0],
      });
    } catch (error) {
      logger.error('创建资源失败:', error);
      throw error;
    }
  };

  /**
   * 更新资源
   */
  public update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dbData: Record<string, any> = {};

      // 前端字段名(camelCase) -> 数据库字段名(snake_case) 映射
      const fieldMapping: Record<string, string> = {
        resourceTypeId: 'resource_type_id',
        resourceName: 'resource_name',
        resourceCode: 'resource_code',
        resourceStatus: 'resource_status',
        longitude: 'longitude',
        latitude: 'latitude',
        altitude: 'altitude',
        speed: 'speed',
        direction: 'direction',
        properties: 'properties',
        departmentId: 'department_id',
      };

      // 遍历映射表，从请求体中提取数据
      Object.entries(fieldMapping).forEach(([camelField, snakeField]) => {
        if (req.body[camelField] !== undefined) {
          dbData[snakeField] = req.body[camelField];
        }
      });

      // 特殊处理properties字段
      if (dbData.properties && typeof dbData.properties === 'object') {
        dbData.properties = JSON.stringify(dbData.properties);
      }

      // 检查是否有数据需要更新
      if (Object.keys(dbData).length === 0) {
        res.json({
          code: 200,
          message: '没有需要更新的数据',
        });
        return;
      }

      const affectedRows = await update('t_resource', dbData, { id });

      if (affectedRows === 0) {
        throw new NotFoundError('资源不存在');
      }

      // 获取更新后的资源数据
      const updatedResource = await query<any[]>(
        `SELECT
          r.id,
          r.resource_name,
          r.resource_status,
          r.longitude,
          r.latitude,
          rt.type_code,
          rt.color
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         WHERE r.id = ?`,
        [id]
      );

      // 广播资源更新事件
      if (updatedResource.length > 0) {
        try {
          const wsGateway = getWsGateway();
          wsGateway.broadcastResourceUpdate({
            id: updatedResource[0].id,
            status: updatedResource[0].resource_status,
            lng: updatedResource[0].longitude,
            lat: updatedResource[0].latitude,
            properties: {
              resourceName: updatedResource[0].resource_name,
              typeCode: updatedResource[0].type_code,
              color: updatedResource[0].color,
            },
          });
        } catch (wsError) {
          logger.warn('WebSocket推送资源更新失败:', wsError);
        }
      }

      logger.info(`更新资源成功: ${id}`);

      res.json({
        code: 200,
        message: '更新成功',
      });
    } catch (error) {
      logger.error('更新资源失败:', error);
      throw error;
    }
  };

  /**
   * 删除资源（软删除）
   */
  public delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await query(
        `UPDATE t_resource SET deleted_at = NOW() WHERE id = ?`,
        [id]
      );

      logger.info(`删除资源成功: ${id}`);

      res.json({
        code: 200,
        message: '删除成功',
      });
    } catch (error) {
      logger.error('删除资源失败:', error);
      throw error;
    }
  };

  /**
   * 查询附近资源
   *
   * 使用空间查询计算指定半径内的资源
   */
  public getNearby = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lng, lat, radius = '1000', type } = req.query;

      if (!lng || !lat) {
        throw new ValidationError('缺少坐标参数');
      }

      // 使用Haversine公式计算距离
      const resources = await query<any[]>(
        `SELECT
          r.id,
          r.resource_name,
          r.resource_status,
          r.longitude,
          r.latitude,
          rt.type_code,
          rt.type_name,
          rt.icon_url,
          rt.color,
          (
            6371000 * acos(
              cos(radians(?)) * cos(radians(r.latitude)) *
              cos(radians(r.longitude) - radians(?)) +
              sin(radians(?)) * sin(radians(r.latitude))
            )
          ) AS distance
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         WHERE r.resource_status = 'online'
           AND r.deleted_at IS NULL
           ${type ? 'AND rt.type_code = ?' : ''}
         HAVING distance < ?
         ORDER BY distance ASC
         LIMIT 100`,
        type
          ? [lat, lng, lat, type, radius]
          : [lat, lng, lat, radius]
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          center: { lng: parseFloat(lng as string), lat: parseFloat(lat as string) },
          radius: parseInt(radius as string),
          count: resources.length,
          list: resources,
        },
      });
    } catch (error) {
      logger.error('查询附近资源失败:', error);
      throw error;
    }
  };

  /**
   * 获取资源类型列表
   */
  public getTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
      const types = await query<any[]>(
        `SELECT
          id,
          type_code,
          type_name,
          category,
          icon_url,
          color,
          sort_order
         FROM t_resource_type
         ORDER BY sort_order ASC, type_name ASC`
      );

      res.json({
        code: 200,
        message: 'success',
        data: types,
      });
    } catch (error) {
      logger.error('获取资源类型失败:', error);
      throw error;
    }
  };

  /**
   * 资源统计
   */
  public getStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      // 按类型统计
      const typeStats = await query<any[]>(
        `SELECT
          rt.type_name,
          rt.type_code,
          COUNT(*) as count,
          SUM(CASE WHEN r.resource_status = 'online' THEN 1 ELSE 0 END) as online_count,
          SUM(CASE WHEN r.resource_status = 'offline' THEN 1 ELSE 0 END) as offline_count,
          SUM(CASE WHEN r.resource_status = 'alarm' THEN 1 ELSE 0 END) as alarm_count
         FROM t_resource r
         LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
         WHERE r.deleted_at IS NULL
         GROUP BY rt.id, rt.type_name, rt.type_code`
      );

      // 总体统计
      const totalStats = await query<any[]>(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN resource_status = 'online' THEN 1 ELSE 0 END) as online,
          SUM(CASE WHEN resource_status = 'offline' THEN 1 ELSE 0 END) as offline,
          SUM(CASE WHEN resource_status = 'alarm' THEN 1 ELSE 0 END) as alarm
         FROM t_resource
         WHERE deleted_at IS NULL`
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          total: totalStats[0]?.total || 0,
          online: totalStats[0]?.online || 0,
          offline: totalStats[0]?.offline || 0,
          alarm: totalStats[0]?.alarm || 0,
          byType: typeStats,
        },
      });
    } catch (error) {
      logger.error('获取资源统计失败:', error);
      throw error;
    }
  };
}

export default ResourceController;
