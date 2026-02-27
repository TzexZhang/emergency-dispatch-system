/**
 * ============================================
 * 地图服务
 * ============================================
 *
 * 功能说明：
 * - 地图初始化与配置
 * - 图层管理（底图、资源层、分析层、轨迹层）
 * - 坐标转换
 * - 视图控制
 * - 空间分析可视化
 * - 轨迹回放
 * - 资源聚合
 *
 * @author Emergency Dispatch Team
 */

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Cluster } from 'ol/source';
import OSM from 'ol/source/OSM';
import Overlay from 'ol/Overlay';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point, Polygon, LineString } from 'ol/geom';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { config } from '@/config';
import type { Resource, ResourceStatus } from '@/types';

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
  useCluster?: boolean;
}

/**
 * 地图服务类
 */
const STATUS_CONFIG: Record<ResourceStatus, { color: string; fillColor: string }> = {
  online: { color: '#52c41a', fillColor: 'rgba(82, 196, 26, 0.3)' },
  offline: { color: '#d9d9d9', fillColor: 'rgba(217, 217, 217, 0.3)' },
  alarm: { color: '#ff4d4f', fillColor: 'rgba(255, 77, 79, 0.3)' },
  processing: { color: '#1890ff', fillColor: 'rgba(24, 144, 255, 0.3)' },
};

export class MapService {
  private map: Map | null = null;
  private baseLayer: TileLayer<OSM> | null = null;
  private resourceLayer: VectorLayer<any> | null = null;
  private resourceSource: VectorSource<Feature> | null = null;
  private clusterLayer: VectorLayer<any> | null = null;
  private clusterSource: Cluster<Feature> | null = null;
  private analysisLayer: VectorLayer<any> | null = null;
  private analysisSource: VectorSource<Feature> | null = null;
  private trajectoryLayer: VectorLayer<any> | null = null;
  private trajectorySource: VectorSource<Feature> | null = null;
  private popupOverlay: Overlay | null = null;
  private playbackAnimationId: number | null = null;
  private useCluster: boolean = false;

  /**
   * 初始化地图
   *
   * @param mapConfig - 地图配置
   * @param useCluster - 是否启用聚合（默认false）
   * @returns OpenLayers Map实例
   */
  public initMap(mapConfig: MapConfig, useCluster: boolean = false): Map {
    this.baseLayer = new TileLayer({
      source: new OSM({
        url: config.map.osmTileUrl,
      }),
    });

    this.resourceSource = new VectorSource<Feature>();
    this.resourceLayer = new VectorLayer({
      source: this.resourceSource,
      zIndex: 10,
    });

    this.clusterSource = new Cluster({
      source: this.resourceSource,
      distance: 40,
    });

    this.clusterLayer = new VectorLayer({
      source: this.clusterSource,
      zIndex: 10,
      style: (feature) => {
        const size = feature.get('features')?.length || 1;
        const radius = 15 + Math.min(size * 2, 20);

        return new Style({
          image: new Circle({
            radius,
            fill: new Fill({ color: `rgba(24, 144, 255, ${Math.min(size / 20 + 0.3, 0.8)})` }),
            stroke: new Stroke({ color: '#1890ff', width: 2 }),
          }),
          text: new Text({
            text: size.toString(),
            font: 'bold 14px sans-serif',
            fill: new Fill({ color: '#fff' }),
          }),
        });
      },
    });

    this.analysisSource = new VectorSource<Feature>();
    this.analysisLayer = new VectorLayer({
      source: this.analysisSource,
      zIndex: 20,
      style: new Style({
        stroke: new Stroke({
          color: '#1890ff',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(24, 144, 255, 0.1)',
        }),
      }),
    });

    this.trajectorySource = new VectorSource<Feature>();
    this.trajectoryLayer = new VectorLayer({
      source: this.trajectorySource,
      zIndex: 30,
      style: new Style({
        stroke: new Stroke({
          color: '#ff4d4f',
          width: 3,
        }),
      }),
    });

    this.useCluster = useCluster;

    const layers: any[] = [this.baseLayer];
    if (useCluster) {
      layers.push(this.clusterLayer);
    } else {
      layers.push(this.resourceLayer);
    }
    if (this.analysisLayer) {
      layers.push(this.analysisLayer);
    }
    if (this.trajectoryLayer) {
      layers.push(this.trajectoryLayer);
    }

    this.map = new Map({
      target: mapConfig.target,
      layers,
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

    this.popupOverlay = new Overlay({
      element: document.createElement('div'),
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });
    this.map.addOverlay(this.popupOverlay);

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
      this.resourceSource = null;
      this.resourceLayer = null;
      this.baseLayer = null;
    }
  }

  /**
   * 创建资源点样式
   */
  private createResourceStyle(status: ResourceStatus, label?: string): Style {
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.offline;

    return new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: statusConfig.fillColor }),
        stroke: new Stroke({ color: statusConfig.color, width: 2 }),
      }),
      text: label
        ? new Text({
            text: label,
            font: '12px sans-serif',
            fill: new Fill({ color: '#333' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            offsetY: -18,
          })
        : undefined,
    });
  }

  /**
   * 更新资源点位
   */
  public updateResources(resources: Resource[]): void {
    if (!this.resourceSource) return;

    this.resourceSource.clear();

    resources.forEach((resource) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([resource.longitude, resource.latitude])),
        data: resource,
      });

      feature.setId(resource.id);
      feature.setStyle(
        this.createResourceStyle(resource.resourceStatus, resource.resourceName)
      );

      this.resourceSource!.addFeature(feature);
    });
  }

  /**
   * 更新单个资源位置
   */
  public updateResourcePosition(
    resourceId: string,
    lng: number,
    lat: number,
    status?: ResourceStatus
  ): void {
    if (!this.resourceSource) return;

    const feature = this.resourceSource.getFeatureById(resourceId);
    if (feature) {
      const geometry = feature.getGeometry();
      if (geometry instanceof Point) {
        geometry.setCoordinates(fromLonLat([lng, lat]));
      }

      if (status) {
        const data = feature.get('data') as Resource;
        if (data) {
          data.resourceStatus = status;
          feature.setStyle(this.createResourceStyle(status, data.resourceName));
        }
      }
    }
  }

  /**
   * 清除所有资源点位
   */
  public clearResources(): void {
    if (this.resourceSource) {
      this.resourceSource.clear();
    }
  }

  /**
   * 获取资源图层
   */
  public getResourceLayer(): VectorLayer<any> | null {
    return this.resourceLayer;
  }

  /**
   * 绘制多边形
   */
  public drawPolygon(coordinates: number[][][]): void {
    if (!this.analysisSource) return;

    const feature = new Feature({
      geometry: new Polygon(coordinates),
    });

    this.analysisSource.addFeature(feature);
  }

  /**
   * 绘制等时圈
   */
  public drawIsochrones(isochrones: any[]): void {
    if (!this.analysisSource) return;

    const colors = ['#52c41a', '#faad14', '#ff4d4f'];

    isochrones.forEach((iso, index) => {
      const feature = new Feature({
        geometry: new Polygon(iso.polygon),
        data: iso,
      });

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: colors[index % colors.length],
            width: 2,
          }),
          fill: new Fill({
            color: colors[index % colors.length].replace(')', ', 0.15)').replace('rgb', 'rgba'),
          }),
        })
      );

      this.analysisSource?.addFeature(feature);
    });
  }

  /**
   * 绘制缓冲区
   */
  public drawBuffers(buffers: any[]): void {
    if (!this.analysisSource) return;

    const colors = ['#1890ff', '#722ed1', '#eb2f96'];

    buffers.forEach((buffer, index) => {
      const feature = new Feature({
        geometry: new Polygon(buffer.polygon),
        data: buffer,
      });

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: colors[index % colors.length],
            width: 2,
          }),
          fill: new Fill({
            color: colors[index % colors.length].replace(')', ', 0.15)').replace('rgb', 'rgba'),
          }),
        })
      );

      this.analysisSource?.addFeature(feature);
    });
  }

  /**
   * 绘制距离线
   */
  public drawDistance(from: [number, number], to: [number, number], distance: number): void {
    if (!this.analysisSource) return;

    const feature = new Feature({
      geometry: new LineString([fromLonLat(from), fromLonLat(to)]),
      data: { distance },
    });

    feature.setStyle(
      new Style({
        stroke: new Stroke({
          color: '#ff4d4f',
          width: 3,
        }),
      })
    );

    this.analysisSource.addFeature(feature);

    const startPoint = new Feature({
      geometry: new Point(fromLonLat(from)),
    });

    startPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: '#52c41a' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      })
    );

    this.analysisSource.addFeature(startPoint);

    const endPoint = new Feature({
      geometry: new Point(fromLonLat(to)),
    });

    endPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: '#ff4d4f' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      })
    );

    this.analysisSource.addFeature(endPoint);
  }

  /**
   * 清除分析图层
   */
  public clearAnalysis(): void {
    if (this.analysisSource) {
      this.analysisSource.clear();
    }
  }

  /**
   * 获取分析图层
   */
  public getAnalysisLayer(): VectorLayer<any> | null {
    return this.analysisLayer;
  }

  /**
   * 绘制轨迹
   */
  public drawTrajectory(points: { lng: number; lat: number }[]): void {
    if (!this.trajectorySource) return;

    this.trajectorySource?.clear();

    const coordinates = points.map((p) => fromLonLat([p.lng, p.lat]));

    const feature = new Feature({
      geometry: new LineString(coordinates),
      data: { points },
    });

    this.trajectorySource?.addFeature(feature);

    const startPoint = new Feature({
      geometry: new Point(coordinates[0]),
    });

    startPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#52c41a' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      })
    );

    this.trajectorySource?.addFeature(startPoint);

    const endPoint = new Feature({
      geometry: new Point(coordinates[coordinates.length - 1]),
    });

    endPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: '#ff4d4f' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
      })
    );

    this.trajectorySource?.addFeature(endPoint);
  }

  /**
   * 轨迹回放
   */
  public playTrajectory(
    points: { lng: number; lat: number }[],
    speed: number = 1000,
    onProgress?: (index: number) => void,
    onComplete?: () => void
  ): void {
    if (!this.trajectorySource) return;

    this.stopTrajectoryPlayback();

    let currentIndex = 0;
    const coordinates = points.map((p) => fromLonLat([p.lng, p.lat]));

    const animate = () => {
      if (currentIndex >= coordinates.length) {
        if (onComplete) onComplete();
        return;
      }

      this.trajectorySource?.clear();

      const feature = new Feature({
        geometry: new LineString(coordinates.slice(0, currentIndex + 1)),
        data: { points: points.slice(0, currentIndex + 1) },
      });

      this.trajectorySource?.addFeature(feature);

      const currentPoint = new Feature({
        geometry: new Point(coordinates[currentIndex]),
      });

      currentPoint.setStyle(
        new Style({
          image: new Circle({
            radius: 10,
            fill: new Fill({ color: '#ff4d4f' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
          }),
        })
      );

      this.trajectorySource?.addFeature(currentPoint);

      if (onProgress) onProgress(currentIndex);

      currentIndex++;
      this.playbackAnimationId = window.setTimeout(animate, speed);
    };

    animate();
  }

  /**
   * 停止轨迹回放
   */
  public stopTrajectoryPlayback(): void {
    if (this.playbackAnimationId !== null) {
      window.clearTimeout(this.playbackAnimationId);
      this.playbackAnimationId = null;
    }
  }

  /**
   * 绘制热力图（使用点图层模拟）
   */
  public drawHeatmap(points: { lng: number; lat: number; weight: number }[]): void {
    if (!this.trajectorySource) return;

    this.trajectorySource.clear();

    const weights = points.map((p) => p.weight);
    const maxWeight = Math.max(...weights, 1);

    points.forEach((point) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.lng, point.lat])),
        data: point,
      });

      const intensity = point.weight / maxWeight;
      const radius = 10 + intensity * 20;
      const opacity = 0.3 + intensity * 0.5;

      feature.setStyle(
        new Style({
          image: new Circle({
            radius,
            fill: new Fill({
              color: `rgba(255, 77, 79, ${opacity})`,
            }),
          }),
        })
      );

      this.trajectorySource?.addFeature(feature);
    });
  }

  /**
   * 清除轨迹图层
   */
  public clearTrajectory(): void {
    this.stopTrajectoryPlayback();
    this.trajectorySource?.clear();
  }

  /**
   * 获取轨迹图层
   */
  public getTrajectoryLayer(): VectorLayer<any> | null {
    return this.trajectoryLayer;
  }

  /**
   * 启用聚合模式
   */
  public enableCluster(): void {
    if (!this.map || !this.resourceLayer || !this.clusterLayer) return;

    this.map.removeLayer(this.resourceLayer);
    this.map.addLayer(this.clusterLayer);
    this.useCluster = true;
  }

  /**
   * 禁用聚合模式
   */
  public disableCluster(): void {
    if (!this.map || !this.resourceLayer || !this.clusterLayer) return;

    this.map.removeLayer(this.clusterLayer);
    this.map.addLayer(this.resourceLayer);
    this.useCluster = false;
  }

  /**
   * 切换聚合模式
   */
  public toggleCluster(): void {
    if (this.useCluster) {
      this.disableCluster();
    } else {
      this.enableCluster();
    }
  }

  /**
   * 设置聚合距离
   */
  public setClusterDistance(distance: number): void {
    if (this.clusterSource) {
      this.clusterSource.setDistance(distance);
    }
  }

  /**
   * 获取聚合图层
   */
  public getClusterLayer(): VectorLayer<any> | null {
    return this.clusterLayer;
  }

  /**
   * 设置弹窗内容
   */
  public setPopupContent(element: HTMLElement): void {
    if (this.popupOverlay) {
      this.popupOverlay.setElement(element);
    }
  }

  /**
   * 显示弹窗
   */
  public showPopup(lng: number, lat: number): void {
    if (this.popupOverlay) {
      this.popupOverlay.setPosition(fromLonLat([lng, lat]));
    }
  }

  /**
   * 隐藏弹窗
   */
  public hidePopup(): void {
    if (this.popupOverlay) {
      this.popupOverlay.setPosition(undefined);
    }
  }

  /**
   * 获取弹窗实例
   */
  public getPopupOverlay(): Overlay | null {
    return this.popupOverlay;
  }

  /**
   * 注册资源点击事件
   */
  public onResourceClick(callback: (feature: Feature) => void): void {
    if (!this.map) return;

    this.map.on('singleclick', (evt) => {
      if (!this.map) return;

      let clickedFeature: any = null;
      let isResourceLayer = false;

      this.map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (layer === this.resourceLayer || layer === this.clusterLayer) {
          clickedFeature = feature;
          isResourceLayer = true;
        }
      });

      if (isResourceLayer && clickedFeature) {
        if (this.useCluster) {
          const features: Feature[] | undefined = clickedFeature.get('features');
          if (features && features.length > 1) {
            const geometry = clickedFeature.getGeometry();
            if (geometry) {
              const extent = geometry.getExtent();
              const view = this.map.getView();
              view?.fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
            }
            return;
          }
        }
        callback(clickedFeature);
      } else {
        this.hidePopup();
      }
    });
  }
}

// 导出单例
export const mapService = new MapService();
export default mapService;
