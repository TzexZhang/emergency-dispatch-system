/**
 * ============================================
 * 轨迹回放服务
 * ============================================
 *
 * 功能说明：
 * - 轨迹查询
 * - 热力图数据获取
 * - 轨迹统计
 * - 轨迹导出
 *
 * @author Emergency Dispatch Team
 */

import { get } from '@/utils/http';

interface TrajectoryQueryParams {
  resourceId?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

interface HeatmapParams {
  resourceId?: string;
  startTime?: string;
  endTime?: string;
  gridSize?: number;
}

interface ExportParams {
  resourceId?: string;
  startTime?: string;
  endTime?: string;
  format?: 'csv' | 'json';
}

interface TrajectoryPoint {
  id: string;
  resourceId: string;
  longitude: number;
  latitude: number;
  speed: number;
  direction: number;
  recordedAt: string;
}

interface TrajectoryResult {
  list: TrajectoryPoint[];
  total: number;
  page: number;
  pageSize: number;
  resourceId: string;
  resourceName: string;
}

interface HeatmapPoint {
  lng: number;
  lat: number;
  weight: number;
}

interface HeatmapResult {
  points: HeatmapPoint[];
  gridSize: number;
  startTime: string;
  endTime: string;
}

interface TrajectoryStats {
  resourceId: string;
  resourceName: string;
  totalDistance: number;
  maxSpeed: number;
  avgSpeed: number;
  duration: number;
  pointCount: number;
  startTime: string;
  endTime: string;
}

export class PlaybackService {
  /**
   * 查询轨迹
   */
  async queryTrajectory(params: TrajectoryQueryParams): Promise<TrajectoryResult> {
    const res = await get('/api/v1/playback/trajectory', { params });
    return res.data;
  }

  /**
   * 获取热力图数据
   */
  async getHeatmap(params: HeatmapParams): Promise<HeatmapResult> {
    const res = await get('/api/v1/playback/heatmap', { params });
    return res.data;
  }

  /**
   * 获取轨迹统计
   */
  async getStats(params: TrajectoryQueryParams): Promise<TrajectoryStats> {
    const res = await get('/api/v1/playback/stats', { params });
    return res.data;
  }

  /**
   * 导出轨迹
   */
  async exportTrajectory(params: ExportParams): Promise<Blob> {
    const res = await get('/api/v1/playback/export', {
      params,
      responseType: 'blob',
    });
    return res as unknown as Blob;
  }
}

export const playbackService = new PlaybackService();
export default playbackService;
