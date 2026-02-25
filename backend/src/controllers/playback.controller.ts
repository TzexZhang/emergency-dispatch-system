/**
 * ============================================
 * 轨迹回放控制器
 * ============================================
 *
 * 功能说明：
 * - 查询轨迹数据
 * - 生成热力图数据
 * - 导出轨迹
 * - 轨迹统计分析
 *
 * @author Emergency Dispatch Team
 */

import { Request, Response } from 'express';
import { query } from '@utils/db';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError } from '@middlewares/error.middleware';

/**
 * 轨迹回放控制器类
 */
export class PlaybackController {
  /**
   * 查询轨迹
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getTrajectory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        resourceId,
        startTime,
        endTime,
      } = req.query;

      // 参数验证
      if (!resourceId) {
        throw new ValidationError('资源ID不能为空');
      }

      if (!startTime || !endTime) {
        throw new ValidationError('开始时间和结束时间不能为空');
      }

      // 查询轨迹数据
      const trajectories = await query<any[]>(
        `SELECT
          t.id,
          t.resource_id,
          r.name as resource_name,
          t.latitude,
          t.longitude,
          t.speed,
          t.direction,
          t.location,
          t.recorded_at
         FROM t_trajectory t
         LEFT JOIN t_resource r ON t.resource_id = r.id
         WHERE t.resource_id = ?
           AND t.recorded_at BETWEEN ? AND ?
         ORDER BY t.recorded_at ASC`,
        [resourceId, startTime, endTime]
      );

      res.json({
        code: 200,
        message: 'success',
        data: {
          resourceId,
          resourceName: trajectories.length > 0 ? trajectories[0].resource_name : null,
          points: trajectories,
          count: trajectories.length,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 获取热力图数据
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getHeatmap = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        resourceId,
        startTime,
        endTime,
        gridSize = 0.01, // 网格大小（度）
      } = req.query;

      // 参数验证
      if (!resourceId) {
        throw new ValidationError('资源ID不能为空');
      }

      if (!startTime || !endTime) {
        throw new ValidationError('开始时间和结束时间不能为空');
      }

      // 查询轨迹数据
      const trajectories = await query<any[]>(
        `SELECT latitude, longitude
         FROM t_trajectory
         WHERE resource_id = ?
           AND recorded_at BETWEEN ? AND ?
         ORDER BY recorded_at ASC`,
        [resourceId, startTime, endTime]
      );

      // 生成热力图数据（简化版：直接返回点数据）
      // 前端可以使用热力图库（如leaflet.heat）来渲染
      const heatmapData = trajectories.map(t => ({
        lat: parseFloat(t.latitude),
        lng: parseFloat(t.longitude),
        intensity: 1, // 可以根据速度、停留时间等计算强度
      }));

      res.json({
        code: 200,
        message: 'success',
        data: {
          resourceId,
          points: heatmapData,
          count: heatmapData.length,
        },
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 导出轨迹
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public exportTrack = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        resourceId,
        startTime,
        endTime,
        format = 'json',
      } = req.query;

      // 参数验证
      if (!resourceId) {
        throw new ValidationError('资源ID不能为空');
      }

      if (!startTime || !endTime) {
        throw new ValidationError('开始时间和结束时间不能为空');
      }

      // 查询轨迹数据
      const trajectories = await query<any[]>(
        `SELECT
          t.resource_id,
          r.name as resource_name,
          t.latitude,
          t.longitude,
          t.speed,
          t.direction,
          t.location,
          t.recorded_at
         FROM t_trajectory t
         LEFT JOIN t_resource r ON t.resource_id = r.id
         WHERE t.resource_id = ?
           AND t.recorded_at BETWEEN ? AND ?
         ORDER BY t.recorded_at ASC`,
        [resourceId, startTime, endTime]
      );

      if (trajectories.length === 0) {
        throw new NotFoundError('没有找到轨迹数据');
      }

      // 根据格式导出
      if (format === 'geojson') {
        // 导出为GeoJSON格式
        const geojson = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                resourceId: trajectories[0].resource_id,
                resourceName: trajectories[0].resource_name,
                startTime,
                endTime,
              },
              geometry: {
                type: 'LineString',
                coordinates: trajectories.map(t => [
                  parseFloat(t.longitude),
                  parseFloat(t.latitude),
                ]),
              },
            },
          ],
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=trajectory-${resourceId}-${Date.now()}.geojson`
        );
        res.send(JSON.stringify(geojson, null, 2));
      } else if (format === 'csv') {
        // 导出为CSV格式
        const headers = ['Time,Latitude,Longitude,Speed,Direction,Location'];
        const rows = trajectories.map(t =>
          `${t.recorded_at},${t.latitude},${t.longitude},${t.speed || 0},${t.direction || 0},${t.location || ''}`
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=trajectory-${resourceId}-${Date.now()}.csv`
        );
        res.send([...headers, ...rows].join('\n'));
      } else {
        // 默认JSON格式
        res.json({
          code: 200,
          message: 'success',
          data: {
            resourceId,
            resourceName: trajectories[0].resource_name,
            startTime,
            endTime,
            points: trajectories,
            count: trajectories.length,
          },
        });
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * 获取轨迹统计信息
   *
   * @param req - 请求对象
   * @param res - 响应对象
   */
  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        resourceId,
        startTime,
        endTime,
      } = req.query;

      // 参数验证
      if (!resourceId) {
        throw new ValidationError('资源ID不能为空');
      }

      if (!startTime || !endTime) {
        throw new ValidationError('开始时间和结束时间不能为空');
      }

      // 查询轨迹统计
      const stats = await query<any[]>(
        `SELECT
          COUNT(*) as point_count,
          MIN(latitude) as min_lat,
          MAX(latitude) as max_lat,
          MIN(longitude) as min_lng,
          MAX(longitude) as max_lng,
          AVG(speed) as avg_speed,
          MAX(speed) as max_speed,
          MIN(recorded_at) as start_time,
          MAX(recorded_at) as end_time
         FROM t_trajectory
         WHERE resource_id = ?
           AND recorded_at BETWEEN ? AND ?`,
        [resourceId, startTime, endTime]
      );

      const stat = stats[0];

      // 计算总距离（简化计算）
      const trajectories = await query<any[]>(
        `SELECT latitude, longitude
         FROM t_trajectory
         WHERE resource_id = ?
           AND recorded_at BETWEEN ? AND ?
         ORDER BY recorded_at ASC`,
        [resourceId, startTime, endTime]
      );

      let totalDistance = 0;
      for (let i = 1; i < trajectories.length; i++) {
        const lat1 = parseFloat(trajectories[i - 1].latitude);
        const lng1 = parseFloat(trajectories[i - 1].longitude);
        const lat2 = parseFloat(trajectories[i].latitude);
        const lng2 = parseFloat(trajectories[i].longitude);

        // Haversine公式计算距离
        const R = 6371; // 地球半径（km）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) *
          Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          pointCount: stat.point_count,
          bounds: {
            minLat: parseFloat(stat.min_lat),
            maxLat: parseFloat(stat.max_lat),
            minLng: parseFloat(stat.min_lng),
            maxLng: parseFloat(stat.max_lng),
          },
          speed: {
            avg: parseFloat(stat.avg_speed) || 0,
            max: parseFloat(stat.max_speed) || 0,
          },
          totalDistance: Math.round(totalDistance * 1000) / 1000, // km
          duration: {
            start: stat.start_time,
            end: stat.end_time,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  };
}

export default PlaybackController;
