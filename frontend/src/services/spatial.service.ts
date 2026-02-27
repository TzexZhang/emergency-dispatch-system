/**
 * ============================================
 * 空间分析服务
 * ============================================
 *
 * 功能说明：
 * - 等时圈计算
 * - 缓冲区分析
 * - 范围内要素查询
 * - 距离计算
 *
 * @author Emergency Dispatch Team
 */

import { post } from '@/utils/http';

interface IsochroneParams {
  lng: number;
  lat: number;
  minutes?: number[];
  profile?: string;
}

interface BufferParams {
  lng: number;
  lat: number;
  radius?: number;
  rings?: number;
  unit?: 'meters' | 'kilometers' | 'miles' | 'degrees';
}

interface WithinParams {
  polygon: number[][];
  type: 'resource' | 'building' | 'incident';
  buffer?: number;
}

interface DistanceParams {
  from: [number, number];
  to: [number, number];
  mode?: 'straight' | 'route';
}

interface IsochroneResult {
  minute: number;
  polygon: number[][][];
  properties: {
    area: number;
  };
}

interface BufferResult {
  radius: number;
  area: number;
  polygon: number[][][];
}

interface DistanceResult {
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  straightDistance: number;
  routeDistance: number | null;
  routeDuration: number | null;
}

export class SpatialService {
  /**
   * 计算等时圈
   */
  async isochrone(params: IsochroneParams): Promise<{
    center: { lng: number; lat: number };
    isochrones: IsochroneResult[];
    buildings: any[];
  }> {
    const res = await post('/api/v1/spatial/isochrone', params);
    return res.data;
  }

  /**
   * 缓冲区分析
   */
  async buffer(params: BufferParams): Promise<{
    center: { lng: number; lat: number };
    buffers: BufferResult[];
  }> {
    const res = await post('/api/v1/spatial/buffer', params);
    return res.data;
  }

  /**
   * 范围内要素查询
   */
  async within(params: WithinParams): Promise<{
    polygon: number[][];
    type: string;
    count: number;
    list: any[];
  }> {
    const res = await post('/api/v1/spatial/within', params);
    return res.data;
  }

  /**
   * 距离计算
   */
  async distance(params: DistanceParams): Promise<DistanceResult> {
    const res = await post('/api/v1/spatial/distance', params);
    return res.data;
  }
}

export const spatialService = new SpatialService();
export default spatialService;
