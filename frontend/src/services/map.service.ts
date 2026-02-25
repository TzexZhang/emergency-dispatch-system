/**
 * ============================================
 * 地图服务
 * ============================================
 *
 * 功能说明：
 * - OpenLayers地图初始化
 * - 图层管理
 * - 视图控制
 * - 坐标系转换
 *
 * @author Emergency Dispatch Team
 */

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { config } from '@/config';

/**
 * 注册自定义坐标系
 */
proj4.defs('EPSG:4490', '+proj=longlat +ellps=GRS80 +no_defs');
proj4.defs('GCJ-02', '+proj=longlat +ellps=WGS84 +no_defs');
register(proj4);

/**
 * 地图配置接口
 */
export interface MapConfig {
  target: string | HTMLElement;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * 地图服务类
 */
export class MapService {
  private map: Map | null = null;
  private baseLayer: TileLayer<OSM> | null = null;

  /**
   * 初始化地图
   *
   * @param mapConfig - 地图配置
   * @returns OpenLayers Map实例
   */
  public initMap(mapConfig: MapConfig): Map {
    // 创建基础图层
    this.baseLayer = new TileLayer({
      source: new OSM({
        // 可配置其他瓦片源（天地图、高德等）
        url: config.map.osmTileUrl,
      }),
    });

    // 创建地图实例
    this.map = new Map({
      target: mapConfig.target,
      layers: [this.baseLayer],
      view: new View({
        center: fromLonLat(mapConfig.center),
        zoom: mapConfig.zoom,
        minZoom: mapConfig.minZoom ?? config.map.minZoom,
        maxZoom: mapConfig.maxZoom ?? config.map.maxZoom,
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false,
      }),
    });

    return this.map;
  }

  /**
   * 获取地图实例
   */
  public getMap(): Map | null {
    return this.map;
  }

  /**
   * 设置地图中心
   *
   * @param lng - 经度
   * @param lat - 纬度
   */
  public setCenter(lng: number, lat: number): void {
    if (!this.map) return;
    const view = this.map.getView();
    view?.animate({
      center: fromLonLat([lng, lat]),
      duration: 1000,
    });
  }

  /**
   * 设置缩放级别
   *
   * @param zoom - 缩放级别
   */
  public setZoom(zoom: number): void {
    if (!this.map) return;
    const view = this.map.getView();
    view?.animate({
      zoom,
      duration: 500,
    });
  }

  /**
   * 飞到指定位置和缩放级别
   *
   * @param lng - 经度
   * @param lat - 纬度
   * @param zoom - 缩放级别
   */
  public flyTo(lng: number, lat: number, zoom: number): void {
    if (!this.map) return;
    const view = this.map.getView();
    view?.animate({
      center: fromLonLat([lng, lat]),
      zoom,
      duration: 1500,
    });
  }

  /**
   * 经纬度转地图坐标
   *
   * @param lng - 经度
   * @param lat - 纬度
   * @param fromProj - 源坐标系（默认WGS84）
   */
  public fromLonLat(lng: number, lat: number, fromProj: string = 'EPSG:4326'): number[] {
    return transform([lng, lat], fromProj, 'EPSG:3857');
  }

  /**
   * 地图坐标转经纬度
   *
   * @param coords - 地图坐标
   * @param toProj - 目标坐标系（默认WGS84）
   */
  public toLonLat(coords: number[], toProj: string = 'EPSG:4326'): number[] {
    return transform(coords, 'EPSG:3857', toProj);
  }

  /**
   * 获取当前视图范围
   */
  public getCurrentExtent(): number[] | undefined {
    if (!this.map) return undefined;
    const view = this.map.getView();
    return view?.calculateExtent();
  }

  /**
   * 获取当前中心点
   */
  public getCenter(): [number, number] | undefined {
    if (!this.map) return undefined;
    const view = this.map.getView();
    const center = view?.getCenter();
    if (!center) return undefined;
    return toLonLat(center) as [number, number];
  }

  /**
   * 获取当前缩放级别
   */
  public getZoom(): number | undefined {
    if (!this.map) return undefined;
    const view = this.map.getView();
    return view?.getZoom();
  }

  /**
   * 添加图层
   *
   * @param layer - 图层实例
   */
  public addLayer(layer: any): void {
    if (!this.map) return;
    this.map.addLayer(layer);
  }

  /**
   * 移除图层
   *
   * @param layer - 图层实例
   */
  public removeLayer(layer: any): void {
    if (!this.map) return;
    this.map.removeLayer(layer);
  }

  /**
   * 销毁地图
   */
  public destroy(): void {
    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
  }
}

// 导出单例
export const mapService = new MapService();
export default mapService;
