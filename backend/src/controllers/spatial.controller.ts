/**
 * ============================================
 * 空间分析控制器
 * ============================================
 *
 * 功能说明：
 * - 调用GraphHopper计算等时圈
 * - 缓冲区分析（使用Turf.js）
 * - 空间范围内要素查询
 * - 距离计算
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import axios from 'axios';
import turf from '@turf/turf';
import { query } from '@utils/db';
import { config } from '@utils/config';
import { logger } from '@utils/logger';
import { ValidationError } from '@middlewares/error.middleware';

/**
 * 空间分析控制器
 */
export class SpatialController {
  /**
   * 等时圈计算
   *
   * 集成GraphHopper Isochrone API
   */
  public isochrone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lng, lat, minutes = [5, 10, 15], profile = 'car' } = req.body;

      // 参数验证
      if (!lng || !lat) {
        throw new ValidationError('缺少坐标参数');
      }

      logger.info(`计算等时圈: ${lng}, ${lat}, ${minutes.join(',')}分钟`);

      // 并发调用GraphHopper API计算多个等时圈
      const isochrones = await Promise.all(
        minutes.map(async (minute: number) => {
          try {
            const response = await axios.post(
              `${config.externalServices.graphhopper.url}/isochrone`,
              {
                location: [lng, lat],
                profile: profile,
                time_limit: minute * 60, // 转换为秒
              },
              {
                timeout: 10000, // 10秒超时
              }
            );

            return {
              minute,
              polygon: response.data.polygons,
              properties: {
                area: response.data.polygons[0]
                  ? turf.area(turf.polygon([response.data.polygons[0]]))
                  : 0,
              },
            };
          } catch (error) {
            logger.error(`GraphHopper等时圈计算失败 (${minute}分钟):`, error);
            return null;
          }
        })
      );

      // 过滤失败结果
      const validIsochrones = isochrones.filter((i) => i !== null);

      // 计算等时圈覆盖的敏感建筑数量
      const buildingStats = await this.queryBuildingsInIsochrones(
        lng,
        lat,
        validIsochrones
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          center: { lng, lat },
          isochrones: validIsochrones,
          buildings: buildingStats,
        },
      });
    } catch (error) {
      logger.error('等时圈计算失败:', error);
      throw error;
    }
  };

  /**
   * 缓冲区分析
   *
   * 使用Turf.js生成缓冲区
   */
  public buffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lng, lat, radius = 1000, rings = 3, unit = 'meters' } = req.body;

      if (!lng || !lat) {
        throw new ValidationError('缺少坐标参数');
      }

      // 创建中心点
      const point = turf.point([lng, lat]);

      // 生成多层环形缓冲区
      const buffers = [];
      const step = radius / rings;

      for (let i = 1; i <= rings; i++) {
        const bufferRadius = step * i;
        const buffer = turf.buffer(point, bufferRadius, { units: unit as any });
        const area = turf.area(buffer);

        buffers.push({
          radius: bufferRadius,
          area: Math.round(area),
          polygon: buffer.geometry.coordinates,
        });
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          center: { lng, lat },
          buffers,
        },
      });
    } catch (error) {
      logger.error('缓冲区分析失败:', error);
      throw error;
    }
  };

  /**
   * 范围内要素查询
   *
   * 支持多边形、圆形范围内查询
   */
  public within = async (req: Request, res: Response): Promise<void> => {
    try {
      const { polygon, type = 'resource', buffer = 0 } = req.body;

      if (!polygon || polygon.length < 3) {
        throw new ValidationError('多边形坐标无效');
      }

      let results: any[] = [];

      // 根据类型查询不同的表
      switch (type) {
        case 'resource':
          // 查询范围内的资源
          results = await this.queryResourcesWithin(polygon);
          break;

        case 'building':
          // 查询范围内的敏感建筑
          results = await this.queryBuildingsWithin(polygon);
          break;

        case 'incident':
          // 查询范围内的事件
          results = await this.queryIncidentsWithin(polygon);
          break;

        default:
          throw new ValidationError('无效的查询类型');
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          polygon,
          type,
          count: results.length,
          list: results,
        },
      });
    } catch (error) {
      logger.error('范围内查询失败:', error);
      throw error;
    }
  };

  /**
   * 距离计算
   *
   * 计算两点间的直线距离和路网距离
   */
  public distance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { from, to, mode = 'straight' } = req.body;

      if (!from || !to || from.length !== 2 || to.length !== 2) {
        throw new ValidationError('坐标参数无效');
      }

      const fromPoint = turf.point(from);
      const toPoint = turf.point(to);

      // 直线距离
      const straightDistance = turf.distance(fromPoint, toPoint, {
        units: 'kilometers',
      });

      let routeDistance = null;
      let routeDuration = null;

      // 如果需要路网距离，调用GraphHopper
      if (mode === 'route') {
        try {
          const response = await axios.get(
            `${config.externalServices.graphhopper.url}/route`,
            {
              params: {
                point: [`${from[1]},${from[0]}`, `${to[1]},${to[0]}`],
                vehicle: 'car',
                calc_points: false,
              },
              timeout: 10000,
            }
          );

          if (response.data.paths && response.data.paths.length > 0) {
            routeDistance = response.data.paths[0].distance / 1000; // 转换为公里
            routeDuration = response.data.paths[0].time / 1000; // 转换为秒
          }
        } catch (error) {
          logger.error('GraphHopper路径规划失败:', error);
        }
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          from: { lng: from[0], lat: from[1] },
          to: { lng: to[0], lat: to[1] },
          straightDistance: Math.round(straightDistance * 1000) / 1000, // 保留3位小数
          routeDistance: routeDistance
            ? Math.round(routeDistance * 1000) / 1000
            : null,
          routeDuration: routeDuration ? Math.round(routeDuration) : null,
        },
      });
    } catch (error) {
      logger.error('距离计算失败:', error);
      throw error;
    }
  }

  /**
   * 查询等时圈覆盖的敏感建筑
   */
  private async queryBuildingsInIsochrones(
    lng: number,
    lat: number,
    isochrones: any[]
  ): Promise<any[]> {
    const results = [];

    for (const isochrone of isochrones) {
      if (!isochrone.polygon || isochrone.polygon.length === 0) continue;

      const polygonCoords = isochrone.polygon[0];

      // 查询多边形内的建筑
      const buildings = await query<any[]>(
        `SELECT
          id,
          building_name,
          building_type,
          longitude,
          latitude,
          capacity
         FROM t_sensitive_building
         WHERE deleted_at IS NULL
           AND ST_Contains(
             ST_GeomFromText(
               CONCAT('POLYGON((',
                 GROUP_CONCAT(longitude, ' ', latitude SEPARATOR ','),
                 '))')
             ),
             POINT(longitude, latitude)
           )`
      );

      results.push({
        minute: isochrone.minute,
        count: buildings.length,
        buildings: buildings.slice(0, 10), // 只返回前10个
      });
    }

    return results;
  }

  /**
   * 查询多边形内的资源
   */
  private async queryResourcesWithin(polygon: number[][]): Promise<any[]> {
    // 使用POINT_IN_POLYGON函数（需要MySQL 8.0+）
    // 或者使用几何库进行判断
    const resources = await query<any[]>(
      `SELECT
        r.id,
        r.resource_name,
        r.resource_status,
        r.longitude,
        r.latitude,
        rt.type_name
       FROM t_resource r
       LEFT JOIN t_resource_type rt ON r.resource_type_id = rt.id
       WHERE r.deleted_at IS NULL`
    );

    // 使用Turf.js过滤多边形内的点
    const poly = turf.polygon([polygon]);
    return resources.filter((r) => {
      const point = turf.point([r.longitude, r.latitude]);
      return turf.booleanPointInPolygon(point, poly);
    });
  }

  /**
   * 查询多边形内的敏感建筑
   */
  private async queryBuildingsWithin(polygon: number[][]): Promise<any[]> {
    const buildings = await query<any[]>(
      `SELECT
        id,
        building_name,
        building_type,
        longitude,
        latitude,
        address,
        capacity
       FROM t_sensitive_building
       WHERE deleted_at IS NULL`
    );

    const poly = turf.polygon([polygon]);
    return buildings.filter((b) => {
      const point = turf.point([b.longitude, b.latitude]);
      return turf.booleanPointInPolygon(point, poly);
    });
  }

  /**
   * 查询多边形内的事件
   */
  private async queryIncidentsWithin(polygon: number[][]): Promise<any[]> {
    const incidents = await query<any[]>(
      `SELECT
        id,
        incident_type,
        incident_level,
        title,
        longitude,
        latitude,
        incident_status,
        reported_at
       FROM t_incident
       WHERE deleted_at IS NULL`
    );

    const poly = turf.polygon([polygon]);
    return incidents.filter((i) => {
      const point = turf.point([i.longitude, i.latitude]);
      return turf.booleanPointInPolygon(point, poly);
    });
  }
}

export default SpatialController;
