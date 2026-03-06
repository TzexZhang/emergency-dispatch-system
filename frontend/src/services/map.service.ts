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

import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Cluster } from "ol/source";
import XYZ from "ol/source/XYZ";
import Overlay from "ol/Overlay";
import { fromLonLat, toLonLat, transform } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { Style, Circle, Fill, Stroke, Text, Icon } from "ol/style";
import { Feature } from "ol";
import { Point, Polygon, LineString } from "ol/geom";
import WebGLPointsLayer from "ol/layer/WebGLPoints";
import Draw from "ol/interaction/Draw";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { config } from "@/config";
import type { Resource, ResourceStatus, IncidentStatus } from "@/types";

/**
 * 注册自定义坐标系
 */
proj4.defs("EPSG:4490", "+proj=longlat +ellps=GRS80 +no_defs");
proj4.defs("GCJ-02", "+proj=longlat +ellps=WGS84 +no_defs");
register(proj4);

/**
 * 地图配置接口
 */
export interface MapConfig {
  target: HTMLElement | string;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  useWebGL?: boolean;
}

/**
 * 地图服务类
 */

// 资源类型图标配置
const RESOURCE_TYPE_CONFIG: Record<
  string,
  {
    shape: "circle" | "cross" | "triangle" | "square" | "diamond" | "star";
    color: string;
    label: string;
  }
> = {
  ambulance: { shape: "cross", color: "#FF0000", label: "救护车" },
  fire_truck: { shape: "triangle", color: "#FF6600", label: "消防车" },
  police_car: { shape: "square", color: "#0000FF", label: "警车" },
  sensor: { shape: "diamond", color: "#00AA00", label: "传感器" },
  person: { shape: "circle", color: "#0066FF", label: "人员" },
};

// ================== 事件类型图标配置（国际通用标准） ==================
const INCIDENT_TYPE_CONFIG: Record<
  string,
  {
    color: string;
    label: string;
    iconType: "fire" | "medical" | "traffic" | "police" | "disaster";
  }
> = {
  fire: { color: "#FF4D4F", label: "火灾", iconType: "fire" },
  medical: { color: "#52C41A", label: "医疗急救", iconType: "medical" },
  traffic: { color: "#1890FF", label: "交通事故", iconType: "traffic" },
  public_security: { color: "#722ED1", label: "公共安全", iconType: "police" },
  natural_disaster: {
    color: "#FA8C16",
    label: "自然灾害",
    iconType: "disaster",
  },
};

// 事件等级颜色
const INCIDENT_LEVEL_COLORS: Record<string, string> = {
  minor: "#52C41A", // 一般 - 绿色
  major: "#FAAD14", // 重大 - 橙色
  severe: "#FF4D4F", // 特大 - 红色
};

// ================== SVG 图标生成函数 ==================

/**
 * 生成火焰图标 SVG (火灾)
 */
const createFireIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.577 1.61-5.126 3.24-7.068.672-.8 1.36-1.532 2.01-2.182C11.5 5.5 12 4.5 12 3c0 2 1.5 3.5 2.5 4.5.65.65 1.338 1.382 2.01 2.182C18.39 10.874 20 13.423 20 16c0 3.866-3.134 7-7 7zm0-4c1.657 0 3-1.343 3-3 0-1.028-.5-2-1.5-3-.5.5-1 1-1.5 1.5-.5-.5-1-1-1.5-1.5-1 1-1.5 1.972-1.5 3 0 1.657 1.343 3 3 3z"/>
  </svg>`;
};

/**
 * 生成医疗十字图标 SVG (医疗急救)
 */
const createMedicalIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
  </svg>`;
};

/**
 * 生成汽车图标 SVG (交通事故)
 */
const createTrafficIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
  </svg>`;
};

/**
 * 生成盾牌图标 SVG (公共安全/治安)
 */
const createPoliceIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
  </svg>`;
};

/**
 * 生成警告三角形图标 SVG (自然灾害)
 */
const createDisasterIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>`;
};

/**
 * 生成救护车图标 SVG
 */
const createAmbulanceIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M20 6h-3.5l-1.5-3H9L7.5 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7 9h-2v2H9v-2H7v-2h2v-2h2v2h2v2zm-4-9l1-2h4l1 2H9z"/>
  </svg>`;
};

/**
 * 生成消防车图标 SVG
 */
const createFireTruckIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M22 16v-2l-2-4H2v8h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-2h-2zM7 19c-.83 0-1.5-.67-1.5-1.5S6.17 16 7 16s1.5.67 1.5 1.5S7.83 19 7 19zm10 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM4 12h10v2H4v-2zm12 0h4l1.5 2H16v-2z"/>
  </svg>`;
};

/**
 * 生成警车图标 SVG
 */
const createPoliceCarIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    <circle cx="12" cy="4" r="2"/>
  </svg>`;
};

/**
 * 生成传感器图标 SVG
 */
const createSensorIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>`;
};

/**
 * 生成人员图标 SVG
 */
const createPersonIconSVG = (color: string, size: number = 24): string => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>`;
};

/**
 * 根据事件类型获取 SVG 图标
 */
const getIncidentIconSVG = (
  type: string,
  color: string,
  size: number = 24,
): string => {
  const config = INCIDENT_TYPE_CONFIG[type];
  if (!config) return createDisasterIconSVG(color, size);

  switch (config.iconType) {
    case "fire":
      return createFireIconSVG(color, size);
    case "medical":
      return createMedicalIconSVG(color, size);
    case "traffic":
      return createTrafficIconSVG(color, size);
    case "police":
      return createPoliceIconSVG(color, size);
    case "disaster":
    default:
      return createDisasterIconSVG(color, size);
  }
};

/**
 * 根据资源类型获取 SVG 图标
 */
const getResourceIconSVG = (
  typeCode: string,
  color: string,
  size: number = 24,
): string => {
  switch (typeCode) {
    case "ambulance":
      return createAmbulanceIconSVG(color, size);
    case "fire_truck":
      return createFireTruckIconSVG(color, size);
    case "police_car":
      return createPoliceCarIconSVG(color, size);
    case "sensor":
      return createSensorIconSVG(color, size);
    case "person":
      return createPersonIconSVG(color, size);
    default:
      return createPersonIconSVG(color, size);
  }
};

/**
 * 将 SVG 转换为 Data URL
 */
const svgToDataURL = (svg: string): string => {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export class MapService {
  // ==================== 核心地图实例 ====================
  /** OpenLayers 地图实例，管理所有图层和交互 */
  private map: OLMap | null = null;

  // ==================== 底图图层 ====================
  /** 底图图层，显示 OSM/高德/天地图瓦片 */
  public baseLayer: TileLayer<XYZ> | null = null;

  // ==================== 资源图层（普通模式） ====================
  /** 资源矢量图层，显示资源/事件点位（非聚合、非WebGL模式） */
  public resourceLayer: VectorLayer<any> | null = null;
  /** 资源数据源，存储资源点位 Feature */
  private resourceSource: VectorSource<Feature> | null = null;

  // ==================== 资源图层（WebGL模式） ====================
  /** WebGL 资源图层，使用 WebGL 加速渲染大量点位 */
  private webglResourceLayer: WebGLPointsLayer<any> | null = null;
  /** WebGL 资源数据源 */
  private webglResourceSource: VectorSource<Feature> | null = null;

  // ==================== 资源图层（聚合模式） ====================
  /** 聚合图层，将相邻点位聚合显示 */
  private clusterLayer: VectorLayer<any> | null = null;
  /** 聚合数据源，包装 resourceSource 实现聚合效果 */
  private clusterSource: Cluster<Feature> | null = null;

  // ==================== 空间分析图层 ====================
  /** 分析图层，显示缓冲区、等时圈、距离线等分析结果 */
  private analysisLayer: VectorLayer<any> | null = null;
  /** 分析数据源 */
  private analysisSource: VectorSource<Feature> | null = null;

  // ==================== 轨迹图层 ====================
  /** 轨迹图层，显示单条轨迹回放 */
  private trajectoryLayer: VectorLayer<any> | null = null;
  /** 轨迹数据源 */
  private trajectorySource: VectorSource<Feature> | null = null;
  /** 多车辆轨迹图层集合，key 为 resourceId */
  private multiTrajectoryLayers: Record<string, VectorLayer<any>> = {};
  /** 多车辆轨迹数据源集合 */
  private multiTrajectorySources: Record<string, VectorSource<Feature>> = {};

  // ==================== 热力图层 ====================
  /** 热力图层，显示点位密度分布 */
  private heatmapLayer: VectorLayer<any> | null = null;
  /** 热力图数据源 */
  private heatmapSource: VectorSource<Feature> | null = null;

  // ==================== 追踪图层 ====================
  /** 追踪图层，高亮显示被追踪的资源（带脉冲动画） */
  private trackingLayer: VectorLayer<any> | null = null;
  /** 追踪数据源 */
  private trackingSource: VectorSource<Feature> | null = null;
  /** 追踪动画定时器 ID */
  private trackingAnimationId: number | null = null;

  // ==================== 临时标记图层 ====================
  /** 临时标记数据源，用于位置选择器等场景 */
  private tempMarkerSource: VectorSource<Feature> | null = null;
  /** 临时标记图层 */
  private tempMarkerLayer: VectorLayer<any> | null = null;

  // ==================== 弹窗覆盖层 ====================
  /** 弹窗覆盖层，在地图上显示信息弹窗 */
  private popupOverlay: Overlay | null = null;

  // ==================== 动画定时器 ====================
  /** 单条轨迹回放动画定时器 ID */
  private playbackAnimationId: number | null = null;
  /** 多车辆轨迹回放动画定时器 ID */
  private multiPlaybackAnimationId: number | null = null;

  // ==================== 渲染模式标志 ====================
  /** 是否启用 WebGL 渲染模式 */
  private useWebGL: boolean = false;

  // ==================== 状态标志 ====================

  // ==================== 样式缓存 ====================
  /** 资源样式缓存，key 为 `${status}_${typeCode}_${label}` */
  private resourceStyleCache: Map<string, Style> = new Map();
  /** 聚合样式缓存，key 为聚合数量 */
  private clusterStyleCache: Map<number, Style> = new Map();

  /**
   * 初始化地图
   *
   * @param mapConfig - 地图配置
   * @param _useCluster - 废弃参数，保留兼容性（始终使用聚合模式）
   * @param useWebGL - 是否使用WebGL渲染（默认false）
   * @returns OpenLayers Map实例
   */
  public initMap(
    mapConfig: MapConfig,
    _useCluster?: boolean,
    useWebGL: boolean = false,
  ): OLMap {
    // 如果已存在地图实例，先销毁
    if (this.map) {
      this.destroy();
    }

    // 使用 XYZ source 支持多种瓦片服务（OSM/高德/天地图等）
    const tileSource = new XYZ({
      url: config.map.osmTileUrl,
      maxZoom: config.map.maxZoom,
      crossOrigin: "anonymous",
    });

    this.baseLayer = new TileLayer({
      source: tileSource,
      zIndex: 0,
      preload: 2, // 预加载2个级别的瓦片
    });

    this.resourceSource = new VectorSource<Feature>();
    this.resourceLayer = new VectorLayer({
      source: this.resourceSource,
      zIndex: 10,
      // 禁用动画和交互时的更新，减少闪烁
      updateWhileAnimating: false,
      updateWhileInteracting: false,
    });

    this.webglResourceSource = new VectorSource<Feature>();
    this.webglResourceLayer = new WebGLPointsLayer({
      source: this.webglResourceSource as any,
      zIndex: 10,
      style: {
        "circle-radius": 8,
        "circle-fill-color": [
          "match",
          ["get", "typeCode"],
          "ambulance",
          "rgba(255, 0, 0, 1)",
          "fire_truck",
          "rgba(255, 102, 0, 1)",
          "police_car",
          "rgba(0, 0, 255, 1)",
          "sensor",
          "rgba(0, 170, 0, 1)",
          "person",
          "rgba(0, 102, 255, 1)",
          "rgba(128, 128, 128, 1)",
        ],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2,
      },
    });

    this.clusterSource = new Cluster({
      source: this.resourceSource,
      distance: 40,
    });

    this.clusterLayer = new VectorLayer({
      source: this.clusterSource,
      zIndex: 10,
      // 禁用动画和交互时的更新，减少闪烁
      updateWhileAnimating: false,
      updateWhileInteracting: false,
      style: (feature) => {
        const features = feature.get("features");
        const size = features?.length || 1;

        // 当聚合数量为1时，显示单独的资源图标样式
        if (size === 1 && features && features[0]) {
          const originalFeature = features[0];
          const data = originalFeature.get("data") as Resource;
          if (data) {
            return this.createResourceStyle(
              data.resourceStatus,
              data.typeCode,
              data.resourceName,
            );
          }
        }

        // 聚合数量大于1时，使用缓存的聚合样式
        const cachedClusterStyle = this.clusterStyleCache.get(size);
        if (cachedClusterStyle) {
          return cachedClusterStyle;
        }

        // 创建新的聚合样式并缓存
        const radius = 15 + Math.min(size * 2, 20);
        const style = new Style({
          image: new Circle({
            radius,
            fill: new Fill({
              color: `rgba(24, 144, 255, ${Math.min(size / 20 + 0.3, 0.8)})`,
            }),
            stroke: new Stroke({ color: "#1890ff", width: 2 }),
          }),
          text: new Text({
            text: size.toString(),
            font: "bold 14px sans-serif",
            fill: new Fill({ color: "#fff" }),
          }),
        });

        // 存入缓存
        this.clusterStyleCache.set(size, style);

        // 限制缓存大小
        if (this.clusterStyleCache.size > 50) {
          const firstKey = this.clusterStyleCache.keys().next().value;
          if (firstKey) {
            this.clusterStyleCache.delete(firstKey);
          }
        }

        return style;
      },
    });

    this.analysisSource = new VectorSource<Feature>();
    this.analysisLayer = new VectorLayer({
      source: this.analysisSource,
      zIndex: 20,
      style: new Style({
        stroke: new Stroke({
          color: "#1890ff",
          width: 2,
        }),
        fill: new Fill({
          color: "rgba(24, 144, 255, 0.1)",
        }),
      }),
    });

    this.trajectorySource = new VectorSource<Feature>();
    this.trajectoryLayer = new VectorLayer({
      source: this.trajectorySource,
      zIndex: 30,
      style: new Style({
        stroke: new Stroke({
          color: "#ff4d4f",
          width: 3,
        }),
      }),
    });

    this.heatmapSource = new VectorSource<Feature>();
    this.heatmapLayer = new VectorLayer({
      source: this.heatmapSource,
      zIndex: 25,
    });

    // 追踪图层 - 用于高亮显示被追踪的资源
    this.trackingSource = new VectorSource<Feature>();
    this.trackingLayer = new VectorLayer({
      source: this.trackingSource,
      zIndex: 100, // 最高层级
    });

    this.useWebGL = useWebGL;

    const layers: any[] = [this.baseLayer];
    if (useWebGL) {
      layers.push(this.webglResourceLayer);
    } else {
      // 始终使用聚合图层
      layers.push(this.clusterLayer);
    }
    if (this.analysisLayer) {
      layers.push(this.analysisLayer);
    }
    if (this.heatmapLayer) {
      layers.push(this.heatmapLayer);
    }
    if (this.trajectoryLayer) {
      layers.push(this.trajectoryLayer);
    }
    if (this.trackingLayer) {
      layers.push(this.trackingLayer);
    }

    this.map = new OLMap({
      target: mapConfig.target,
      layers,
      view: new View({
        center: fromLonLat(mapConfig.center || [116.404, 39.915]),
        zoom: mapConfig.zoom || 12,
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
      element: document.createElement("div"),
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });
    this.map.addOverlay(this.popupOverlay);

    // 强制触发初始渲染和瓦片加载
    this.map.updateSize();
    this.map.render();

    // 刷新瓦片源
    const baseSource = this.baseLayer?.getSource() as XYZ;
    if (baseSource) {
      baseSource.refresh();
    }

    // 【缩放等级动态调整聚合距离】
    // 缩放级别越低（地图越远），聚合距离越大，更多点被聚合
    // 缩放级别越高（地图越近），聚合距离越小，点被拆分
    if (this.clusterSource && this.map) {
      const updateClusterDistance = () => {
        const zoom = this.map?.getView()?.getZoom() ?? 12;
        // zoom 3 -> distance 120, zoom 18 -> distance 30
        const minZoom = 3;
        const maxZoom = 18;
        const minDistance = 30;
        const maxDistance = 120;
        const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        const ratio = (normalizedZoom - minZoom) / (maxZoom - minZoom);
        const distance = Math.round(maxDistance - ratio * (maxDistance - minDistance));
        this.clusterSource?.setDistance(distance);
      };

      // 初始设置
      updateClusterDistance();

      // 监听缩放结束事件
      this.map.on("moveend", updateClusterDistance);
    }

    return this.map;
  }

  /**
   * 获取地图实例
   */
  public getMap(): OLMap | null {
    return this.map;
  }

  /**
   * 监听缩放级别变化
   * @param callback - 缩放变化时的回调函数
   * @returns 取消监听的函数
   */
  public onZoomChange(callback: (zoom: number) => void): () => void {
    if (!this.map) {
      return () => {};
    }

    const view = this.map.getView();
    if (!view) {
      return () => {};
    }

    const listener = () => {
      const zoom = view.getZoom();
      if (zoom !== undefined) {
        callback(zoom);
      }
    };

    view.on("change:resolution", listener);

    return () => {
      view.un("change:resolution", listener);
    };
  }

  /**
   * 检查地图是否已初始化完成
   *
   * 【判断依据】
   * 1. map 实例存在
   * 2. map 已绑定 DOM 容器
   * 3. 地图尺寸大于 0
   *
   * @returns 地图是否就绪
   */
  public isMapReady(): boolean {
    if (!this.map) return false;
    const target = this.map.getTargetElement();
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * 等待地图加载完成后执行回调
   *
   * 【功能说明】
   * - 地图初始化是异步的，需要等待 DOM 容器就绪
   * - 此方法会轮询检查地图状态，就绪后执行回调
   *
   * @param callback - 地图就绪后执行的回调函数
   * @param timeout - 超时时间（毫秒），默认 5000ms
   * @param interval - 检查间隔（毫秒），默认 100ms
   */
  public onMapReady(
    callback: () => void,
    timeout: number = 5000,
    interval: number = 100,
  ): void {
    // 如果地图已经就绪，立即执行
    if (this.isMapReady()) {
      callback();
      return;
    }

    const startTime = Date.now();

    const checkReady = () => {
      if (this.isMapReady()) {
        callback();
        return;
      }

      if (Date.now() - startTime > timeout) {
        console.warn("[MapService] 等待地图加载超时");
        return;
      }

      setTimeout(checkReady, interval);
    };

    checkReady();
  }

  /**
   * 获取地图加载状态
   *
   * @returns 地图各维度的状态信息
   */
  public getMapStatus(): {
    isInitialized: boolean;
    hasTarget: boolean;
    hasSize: boolean;
    hasBaseLayer: boolean;
  } {
    const result = {
      isInitialized: !!this.map,
      hasTarget: false,
      hasSize: false,
      hasBaseLayer: !!this.baseLayer,
    };

    if (this.map) {
      const target = this.map.getTargetElement();
      result.hasTarget = !!target;
      if (target) {
        const rect = target.getBoundingClientRect();
        result.hasSize = rect.width > 0 && rect.height > 0;
      }
    }

    return result;
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
  /**
   * 飞到指定位置和缩放级别
   * 支持两种调用方式：
   * - flyTo([lng, lat], zoom, duration)
   * - flyTo(lng, lat, zoom)
   */
  public flyTo(
    coordOrLng: [number, number] | number,
    zoomOrLat?: number,
    durationOrZoom?: number,
  ): void {
    if (!this.map) return;
    const view = this.map.getView();

    let center: [number, number];
    let zoom: number;
    let duration: number;

    // 判断参数类型
    if (Array.isArray(coordOrLng)) {
      // flyTo([lng, lat], zoom, duration)
      center = coordOrLng;
      zoom = zoomOrLat ?? 12;
      duration = durationOrZoom ?? 1500;
    } else {
      // flyTo(lng, lat, zoom)
      center = [coordOrLng, zoomOrLat!];
      zoom = durationOrZoom ?? 12;
      duration = 1500;
    }

    view?.animate({
      center: fromLonLat(center),
      zoom,
      duration,
    });
  }

  /**
   * 经纬度转地图坐标
   *
   * @param lng - 经度
   * @param lat - 纬度
   * @param fromProj - 源坐标系（默认WGS84）
   */
  public fromLonLat(
    lng: number,
    lat: number,
    fromProj: string = "EPSG:4326",
  ): number[] {
    return transform([lng, lat], fromProj, "EPSG:3857");
  }

  /**
   * 地图坐标转经纬度
   *
   * @param coords - 地图坐标
   * @param toProj - 目标坐标系（默认WGS84）
   */
  public toLonLat(coords: number[], toProj: string = "EPSG:4326"): number[] {
    return transform(coords, "EPSG:3857", toProj);
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
   * 更新地图尺寸
   * 当容器尺寸发生变化时调用此方法，确保地图正确渲染
   */
  public updateSize(): void {
    if (!this.map) return;
    this.map.updateSize();
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
      this.map.dispose();
      this.map = null;
    }
    // 清理所有图层和源
    this.baseLayer = null;
    this.resourceSource = null;
    this.resourceLayer = null;
    this.webglResourceSource = null;
    this.webglResourceLayer = null;
    this.clusterSource = null;
    this.clusterLayer = null;
    this.analysisSource = null;
    this.analysisLayer = null;
    this.trajectorySource = null;
    this.trajectoryLayer = null;
    this.heatmapSource = null;
    this.heatmapLayer = null;
    this.trackingSource = null;
    this.trackingLayer = null;
    this.tempMarkerSource = null;
    this.tempMarkerLayer = null;
    this.popupOverlay = null;
    this.multiTrajectoryLayers = {};
    this.multiTrajectorySources = {};
    this.useWebGL = false;
    // 清理样式缓存
    this.resourceStyleCache.clear();
    this.clusterStyleCache.clear();
  }

  /**
   * 添加临时标记点（用于位置选择器）
   *
   * @param lng - 经度
   * @param lat - 纬度
   * @param options - 标记选项
   * @returns Feature 实例
   */
  public addMarker(
    lng: number,
    lat: number,
    options?: { color?: string; scale?: number },
  ): Feature {
    // 初始化临时标记图层
    if (!this.tempMarkerSource) {
      this.tempMarkerSource = new VectorSource<Feature>();
      this.tempMarkerLayer = new VectorLayer({
        source: this.tempMarkerSource,
        zIndex: 200,
      });
      if (this.map) {
        this.map.addLayer(this.tempMarkerLayer);
      }
    }

    // 清除现有标记
    this.tempMarkerSource.clear();

    // 创建新标记
    const feature = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
    });

    const color = options?.color || "#1890ff";
    const scale = options?.scale || 1;

    feature.setStyle(
      new Style({
        image: new Circle({
          radius: 10 * scale,
          fill: new Fill({ color }),
          stroke: new Stroke({
            color: "#fff",
            width: 3,
          }),
        }),
      }),
    );

    this.tempMarkerSource.addFeature(feature);
    return feature;
  }

  /**
   * 移除临时标记点
   *
   * @param feature - 要移除的 Feature
   */
  public removeMarker(feature: Feature): void {
    if (this.tempMarkerSource) {
      this.tempMarkerSource.removeFeature(feature);
    }
  }

  /**
   * 清除所有临时标记
   */
  public clearMarkers(): void {
    if (this.tempMarkerSource) {
      this.tempMarkerSource.clear();
    }
  }

  /**
   * 创建资源点样式 - 根据资源类型显示不同图标（国际通用图标）
   * 支持事件类型（以 incident_ 开头的 typeCode）
   * 使用缓存避免重复创建样式对象
   */
  private createResourceStyle(
    status: ResourceStatus | IncidentStatus,
    typeCode?: string,
    label?: string,
  ): Style {
    // 生成缓存键
    const cacheKey = `${status}_${typeCode || "default"}_${label || ""}`;

    // 检查缓存
    const cachedStyle = this.resourceStyleCache.get(cacheKey);
    if (cachedStyle) {
      return cachedStyle;
    }

    const iconSize = 28;
    let color = "#1890ff";
    let opacity = 1;
    let svgIcon: string;

    // 检查是否为事件类型（以 incident_ 开头）
    if (typeCode?.startsWith("incident_")) {
      const incidentType = typeCode.replace("incident_", "");
      const typeConfig =
        INCIDENT_TYPE_CONFIG[incidentType] ||
        INCIDENT_TYPE_CONFIG.natural_disaster;

      // 根据状态调整颜色
      if (status === "pending") {
        color = "#faad14";
      } else if (status === "processing") {
        color = "#1890ff";
      } else if (status === "resolved") {
        color = "#52c41a";
      } else if (status === "closed") {
        color = "#8c8c8c";
        opacity = 0.6;
      } else {
        color = typeConfig.color;
      }

      svgIcon = getIncidentIconSVG(incidentType, color, iconSize);
    } else {
      // 资源类型
      const typeConfig =
        RESOURCE_TYPE_CONFIG[typeCode || ""] || RESOURCE_TYPE_CONFIG.person;
      color = typeConfig.color;

      // 根据状态调整颜色透明度
      if (status === "offline") {
        color = "#8c8c8c";
        opacity = 0.6;
      } else if (status === "alarm") {
        color = "#ff4d4f";
      } else if (status === "processing") {
        color = "#1890ff";
      }

      svgIcon = getResourceIconSVG(typeCode || "person", color, iconSize);
    }

    const iconSrc = svgToDataURL(svgIcon);

    const style = new Style({
      image: new Icon({
        src: iconSrc,
        width: iconSize,
        height: iconSize,
        opacity: opacity,
        anchor: [0.5, 1],
        anchorXUnits: "fraction",
        anchorYUnits: "fraction",
      }),
      text: label
        ? new Text({
            text: label,
            font: "12px sans-serif",
            fill: new Fill({ color: "#333" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
            offsetY: -32,
          })
        : undefined,
    });

    // 存入缓存
    this.resourceStyleCache.set(cacheKey, style);

    // 限制缓存大小，避免内存泄漏
    if (this.resourceStyleCache.size > 100) {
      const firstKey = this.resourceStyleCache.keys().next().value;
      if (firstKey) {
        this.resourceStyleCache.delete(firstKey);
      }
    }

    return style;
  }

  /**
   * 创建事件点样式 - 根据事件类型显示不同图标（国际通用图标）
   */
  public createIncidentStyle(
    incidentType: string,
    level?: string,
    label?: string,
  ): Style {
    const typeConfig =
      INCIDENT_TYPE_CONFIG[incidentType] ||
      INCIDENT_TYPE_CONFIG.natural_disaster;
    const levelColor = level ? INCIDENT_LEVEL_COLORS[level] : typeConfig.color;
    const iconSize = 28;

    // 生成 SVG 图标
    const svgIcon = getIncidentIconSVG(incidentType, levelColor, iconSize);
    const iconSrc = svgToDataURL(svgIcon);

    return new Style({
      image: new Icon({
        src: iconSrc,
        width: iconSize,
        height: iconSize,
        anchor: [0.5, 1],
        anchorXUnits: "fraction",
        anchorYUnits: "fraction",
      }),
      text: label
        ? new Text({
            text: label,
            font: "12px sans-serif",
            fill: new Fill({ color: "#333" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
            offsetY: -32,
          })
        : undefined,
    });
  }

  /**
   * 更新资源点位
   */
  public updateResources(resources: Resource[]): void {
    if (this.useWebGL) {
      if (!this.webglResourceSource) return;
      this.webglResourceSource.clear();

      resources.forEach((resource) => {
        const lng = Number(resource.longitude);
        const lat = Number(resource.latitude);
        if (isNaN(lng) || isNaN(lat)) return;

        const feature = new Feature({
          geometry: new Point(fromLonLat([lng, lat])),
          data: resource,
          resourceStatus: resource.resourceStatus,
          typeCode: resource.typeCode,
        });
        feature.setId(resource.id);
        this.webglResourceSource!.addFeature(feature);
      });
    } else {
      if (!this.resourceSource) return;
      this.resourceSource.clear();

      const validResources: Resource[] = [];
      resources.forEach((resource) => {
        const lng = Number(resource.longitude);
        const lat = Number(resource.latitude);
        if (isNaN(lng) || isNaN(lat)) return;

        const feature = new Feature({
          geometry: new Point(fromLonLat([lng, lat])),
          data: resource,
        });

        feature.setId(resource.id);
        feature.setStyle(
          this.createResourceStyle(
            resource.resourceStatus,
            resource.typeCode,
            resource.resourceName,
          ),
        );

        this.resourceSource!.addFeature(feature);
        validResources.push(resource);
      });
    }
  }

  /**
   * 更新单个资源位置
   */
  public updateResourcePosition(
    resourceId: string,
    lng: number,
    lat: number,
    status?: ResourceStatus,
  ): void {
    if (this.useWebGL) {
      if (!this.webglResourceSource) return;
      const feature = this.webglResourceSource.getFeatureById(resourceId);
      if (feature) {
        const geometry = feature.getGeometry();
        if (geometry instanceof Point) {
          geometry.setCoordinates(fromLonLat([lng, lat]));
        }

        if (status) {
          feature.set("resourceStatus", status);
        }
      }
    } else {
      if (!this.resourceSource) return;
      const feature = this.resourceSource.getFeatureById(resourceId);
      if (feature) {
        const geometry = feature.getGeometry();
        if (geometry instanceof Point) {
          geometry.setCoordinates(fromLonLat([lng, lat]));
        }

        if (status) {
          const data = feature.get("data") as Resource;
          if (data) {
            data.resourceStatus = status;
            feature.setStyle(
              this.createResourceStyle(
                status,
                data.typeCode,
                data.resourceName,
              ),
            );
          }
        }
      }
    }
  }

  /**
   * 清除所有资源点位
   */
  public clearResources(): void {
    if (this.useWebGL) {
      this.webglResourceSource?.clear();
    } else {
      this.resourceSource?.clear();
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

    const colors = ["#52c41a", "#faad14", "#ff4d4f"];

    isochrones.forEach((iso, index) => {
      const polygon = Array.isArray(iso.polygon[0])
        ? iso.polygon
        : [iso.polygon];

      const feature = new Feature({
        geometry: new Polygon(polygon),
        data: iso,
      });

      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: colors[index % colors.length],
            width: 2,
          }),
          fill: new Fill({
            color: colors[index % colors.length]
              .replace(")", ", 0.15)")
              .replace("rgb", "rgba"),
          }),
        }),
      );

      this.analysisSource?.addFeature(feature);
    });
  }

  /**
   * 绘制缓冲区
   */
  public drawBuffers(buffers: any[]): void {
    if (!this.analysisSource) return;

    const colors = ["#1890ff", "#722ed1", "#eb2f96"];

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
            color: colors[index % colors.length]
              .replace(")", ", 0.15)")
              .replace("rgb", "rgba"),
          }),
        }),
      );

      this.analysisSource?.addFeature(feature);
    });
  }

  /**
   * 绘制距离线
   */
  public drawDistance(
    from: [number, number],
    to: [number, number],
    distance: number,
  ): void {
    if (!this.analysisSource) return;

    const feature = new Feature({
      geometry: new LineString([fromLonLat(from), fromLonLat(to)]),
      data: { distance },
    });

    feature.setStyle(
      new Style({
        stroke: new Stroke({
          color: "#ff4d4f",
          width: 3,
        }),
      }),
    );

    this.analysisSource.addFeature(feature);

    const startPoint = new Feature({
      geometry: new Point(fromLonLat(from)),
    });

    startPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: "#52c41a" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      }),
    );

    this.analysisSource.addFeature(startPoint);

    const endPoint = new Feature({
      geometry: new Point(fromLonLat(to)),
    });

    endPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: "#ff4d4f" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      }),
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
          fill: new Fill({ color: "#52c41a" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      }),
    );

    this.trajectorySource?.addFeature(startPoint);

    const endPoint = new Feature({
      geometry: new Point(coordinates[coordinates.length - 1]),
    });

    endPoint.setStyle(
      new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "#ff4d4f" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      }),
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
    onComplete?: () => void,
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
            fill: new Fill({ color: "#ff4d4f" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
          }),
        }),
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
   * 多车辆同步轨迹回放
   */
  public playMultiTrajectory(
    trajectories: Array<{
      resourceId: string;
      resourceName: string;
      color: string;
      points: { lng: number; lat: number; timestamp?: string }[];
    }>,
    speed: number = 1000,
    onProgress?: (timestamp: string, progress: number) => void,
    onComplete?: () => void,
  ): void {
    if (!this.map) return;

    this.stopMultiTrajectoryPlayback();

    const allTimestamps = trajectories.flatMap((t) =>
      t.points
        .map((p) => p.timestamp)
        .filter((ts): ts is string => ts !== undefined),
    );
    const uniqueTimestamps = [...new Set(allTimestamps)].sort();
    const totalFrames = uniqueTimestamps.length;

    const colorMap = trajectories.reduce(
      (acc, t) => {
        acc[t.resourceId] = t.color;
        return acc;
      },
      {} as Record<string, string>,
    );

    let frameIndex = 0;

    const animate = () => {
      if (frameIndex >= totalFrames) {
        if (onComplete) onComplete();
        return;
      }

      const currentTimestamp = uniqueTimestamps[frameIndex];

      trajectories.forEach((trajectory) => {
        const source = this.multiTrajectorySources[trajectory.resourceId];
        if (!source) return;

        const currentPoint = trajectory.points.find(
          (p) => p.timestamp === currentTimestamp,
        );
        if (!currentPoint) return;

        const index = trajectory.points.indexOf(currentPoint);
        const coordinates = trajectory.points
          .slice(0, index + 1)
          .map((p) => fromLonLat([p.lng, p.lat]));

        source.clear();

        const lineFeature = new Feature({
          geometry: new LineString(coordinates),
          data: {
            resourceId: trajectory.resourceId,
            resourceName: trajectory.resourceName,
          },
        });

        lineFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: colorMap[trajectory.resourceId],
              width: 3,
            }),
          }),
        );

        source.addFeature(lineFeature);

        const pointFeature = new Feature({
          geometry: new Point(coordinates[coordinates.length - 1]),
          data: {
            resourceId: trajectory.resourceId,
            resourceName: trajectory.resourceName,
          },
        });

        pointFeature.setStyle(
          new Style({
            image: new Circle({
              radius: 8,
              fill: new Fill({ color: colorMap[trajectory.resourceId] }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          }),
        );

        source.addFeature(pointFeature);
      });

      if (onProgress) {
        onProgress(currentTimestamp, (frameIndex / totalFrames) * 100);
      }

      frameIndex++;
      this.multiPlaybackAnimationId = window.setTimeout(animate, speed);
    };

    animate();
  }

  /**
   * 停止多车辆轨迹回放
   */
  public stopMultiTrajectoryPlayback(): void {
    if (this.multiPlaybackAnimationId !== null) {
      window.clearTimeout(this.multiPlaybackAnimationId);
      this.multiPlaybackAnimationId = null;
    }
  }

  /**
   * 初始化多车辆轨迹图层
   */
  public initMultiTrajectoryLayers(
    trajectories: Array<{
      resourceId: string;
      resourceName: string;
      color: string;
    }>,
  ): void {
    if (!this.map) return;

    this.clearMultiTrajectoryLayers();

    trajectories.forEach((trajectory) => {
      const source = new VectorSource<Feature>();
      const layer = new VectorLayer({
        source,
        zIndex: 100,
      });

      this.multiTrajectorySources[trajectory.resourceId] = source;
      this.multiTrajectoryLayers[trajectory.resourceId] = layer;
      this.map!.addLayer(layer);
    });
  }

  /**
   * 清除多车辆轨迹图层
   */
  public clearMultiTrajectoryLayers(): void {
    this.stopMultiTrajectoryPlayback();

    Object.values(this.multiTrajectoryLayers).forEach((layer) => {
      this.map?.removeLayer(layer);
      layer.getSource()?.clear();
    });

    this.multiTrajectoryLayers = {};
    this.multiTrajectorySources = {};
  }

  /**
   * 绘制热力图（使用点图层模拟）
   */
  public drawHeatmap(
    points: { lng: number; lat: number; weight: number }[],
  ): void {
    if (!this.heatmapSource) return;

    this.heatmapSource.clear();

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
        }),
      );

      this.heatmapSource?.addFeature(feature);
    });
  }

  /**
   * 时间动态热力图
   */
  private timeHeatmapAnimationId: number | null = null;

  public playTimeHeatmap(
    timeSeriesData: Array<{
      timestamp: string;
      points: { lng: number; lat: number; weight: number }[];
    }>,
    speed: number = 1000,
    onProgress?: (timestamp: string, progress: number) => void,
    onComplete?: () => void,
  ): void {
    if (!this.heatmapSource) return;

    this.stopTimeHeatmap();

    let frameIndex = 0;
    const totalFrames = timeSeriesData.length;

    const animate = () => {
      if (frameIndex >= totalFrames) {
        if (onComplete) onComplete();
        return;
      }

      const currentData = timeSeriesData[frameIndex];
      this.drawHeatmap(currentData.points);

      if (onProgress) {
        onProgress(currentData.timestamp, (frameIndex / totalFrames) * 100);
      }

      frameIndex++;
      this.timeHeatmapAnimationId = window.setTimeout(animate, speed);
    };

    animate();
  }

  /**
   * 停止时间动态热力图
   */
  public stopTimeHeatmap(): void {
    if (this.timeHeatmapAnimationId !== null) {
      window.clearTimeout(this.timeHeatmapAnimationId);
      this.timeHeatmapAnimationId = null;
    }
  }

  /**
   * 清除热力图
   */
  public clearHeatmap(): void {
    this.stopTimeHeatmap();
    this.heatmapSource?.clear();
  }

  /**
   * 清除轨迹图层
   */
  public clearTrajectory(): void {
    this.stopTrajectoryPlayback();
    this.stopMultiTrajectoryPlayback();
    this.trajectorySource?.clear();
    Object.values(this.multiTrajectorySources).forEach((source) =>
      source.clear(),
    );
  }

  /**
   * 获取轨迹图层
   */
  public getTrajectoryLayer(): VectorLayer<any> | null {
    return this.trajectoryLayer;
  }

  /**
   * 清除分析图层
   */
  public clearAnalysisLayer(): void {
    this.analysisSource?.clear();
  }

  private drawingInteraction: any = null;
  private currentDrawingFeature: any = null;

  /**
   * 开始绘制
   */
  public startDrawing(type: "point" | "line" | "polygon"): void {
    if (!this.map) return;

    this.disableDrawing();

    this.drawingInteraction = new Draw({
      source: this.analysisSource!,
      type:
        type === "point" ? "Point" : type === "line" ? "LineString" : "Polygon",
    });

    this.drawingInteraction.on("drawend", (evt: any) => {
      this.currentDrawingFeature = evt.feature;
      this.disableDrawing();
    });

    this.map.addInteraction(this.drawingInteraction);
  }

  /**
   * 禁用绘制
   */
  public disableDrawing(): void {
    if (this.drawingInteraction && this.map) {
      this.map.removeInteraction(this.drawingInteraction);
      this.drawingInteraction = null;
    }
  }

  /**
   * 获取当前绘制
   */
  public getCurrentDrawing(): {
    type: "point" | "line" | "polygon";
    coordinates: any[];
  } | null {
    if (!this.currentDrawingFeature) return null;

    const geometry = this.currentDrawingFeature.getGeometry();
    if (!geometry) return null;

    let type: "point" | "line" | "polygon" = "point";
    let coordinates: any[] = [];

    if (geometry.getType() === "Point") {
      type = "point";
      coordinates = toLonLat(geometry.getCoordinates());
    } else if (geometry.getType() === "LineString") {
      type = "line";
      coordinates = geometry.getCoordinates().map((c: any) => toLonLat(c));
    } else if (geometry.getType() === "Polygon") {
      type = "polygon";
      coordinates = geometry.getCoordinates()[0].map((c: any) => toLonLat(c));
    }

    return { type, coordinates };
  }

  /**
   * 清除绘制
   */
  public clearDrawing(): void {
    this.currentDrawingFeature = null;
    this.analysisSource?.clear();
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

    this.map.on("singleclick", (evt) => {
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
        // 始终使用聚合逻辑处理点击
        const features: Feature[] | undefined =
          clickedFeature.get("features");
        if (features && features.length > 1) {
          // 点击聚合点，放大地图
          const geometry = clickedFeature.getGeometry();
          if (geometry) {
            const extent = geometry.getExtent();
            const view = this.map.getView();
            view?.fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
          }
          return;
        }
        // 聚合数量为1时，获取原始feature的数据
        if (features && features.length === 1) {
          const originalFeature = features[0];
          const data = originalFeature.get("data") as Resource;
          if (data) {
            // 创建一个包含正确id的feature返回给回调
            callback(originalFeature);
            return;
          }
        }
        callback(clickedFeature);
      } else {
        this.hidePopup();
      }
    });
  }

  /**
   * 高亮追踪资源
   * 在地图上显示脉冲动画效果的圆圈，并放大地图到合适级别
   */
  public highlightTrackingResource(resource: Resource): void {
    if (!this.map || !this.trackingSource) return;

    // 清除之前的追踪效果
    this.clearTracking();

    const lng = Number(resource.longitude);
    const lat = Number(resource.latitude);
    if (isNaN(lng) || isNaN(lat)) return;

    // 创建多层追踪标记以增强视觉效果
    // 外层脉冲圈
    const outerRing = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
    });
    outerRing.setId("tracking-outer-" + resource.id);

    // 内层实心圈
    const innerRing = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
      data: resource,
    });
    innerRing.setId("tracking-inner-" + resource.id);

    // 中心点
    const centerPoint = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
    });
    centerPoint.setId("tracking-center-" + resource.id);

    // 文字标签
    const labelFeature = new Feature({
      geometry: new Point(fromLonLat([lng, lat])),
    });
    labelFeature.setId("tracking-label-" + resource.id);

    this.trackingSource.addFeatures([
      outerRing,
      innerRing,
      centerPoint,
      labelFeature,
    ]);

    // 脉冲动画
    let pulseScale = 0;
    let growing = true;

    const updateStyles = () => {
      // 外层脉冲圈 - 大范围扩散
      outerRing.setStyle(
        new Style({
          image: new Circle({
            radius: 30 + pulseScale * 40,
            fill: new Fill({
              color: `rgba(24, 144, 255, ${0.3 - pulseScale * 0.25})`,
            }),
            stroke: new Stroke({
              color: `rgba(24, 144, 255, ${0.8 - pulseScale * 0.6})`,
              width: 3,
            }),
          }),
        }),
      );

      // 内层圈 - 中等大小
      innerRing.setStyle(
        new Style({
          image: new Circle({
            radius: 20,
            fill: new Fill({ color: "rgba(24, 144, 255, 0.4)" }),
            stroke: new Stroke({ color: "#1890ff", width: 4 }),
          }),
        }),
      );

      // 中心点 - 小而亮
      centerPoint.setStyle(
        new Style({
          image: new Circle({
            radius: 10,
            fill: new Fill({ color: "#1890ff" }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
          }),
        }),
      );

      // 标签
      labelFeature.setStyle(
        new Style({
          text: new Text({
            text: `📍 ${resource.resourceName || "追踪中..."}`,
            font: "bold 16px sans-serif",
            fill: new Fill({ color: "#1890ff" }),
            stroke: new Stroke({ color: "#fff", width: 4 }),
            offsetY: -50,
            backgroundFill: new Fill({ color: "rgba(255, 255, 255, 0.9)" }),
            backgroundStroke: new Stroke({ color: "#1890ff", width: 2 }),
            padding: [5, 8, 5, 8],
          }),
        }),
      );
    };

    updateStyles();

    this.trackingAnimationId = window.setInterval(() => {
      if (growing) {
        pulseScale += 0.03;
        if (pulseScale >= 1) {
          growing = false;
        }
      } else {
        pulseScale -= 0.03;
        if (pulseScale <= 0) {
          growing = true;
        }
      }
      updateStyles();
    }, 40);

    // 将视图移动到资源位置，使用较高的缩放级别
    const view = this.map.getView();
    const targetZoom = 16; // 足够高的缩放级别，避免聚合

    view?.animate({
      center: fromLonLat([lng, lat]),
      zoom: targetZoom,
      duration: 800,
    });
  }

  /**
   * 清除追踪效果
   */
  public clearTracking(): void {
    if (this.trackingAnimationId !== null) {
      window.clearInterval(this.trackingAnimationId);
      this.trackingAnimationId = null;
    }
    if (this.trackingSource) {
      this.trackingSource.clear();
    }
  }

  /**
   * 更新追踪资源位置
   */
  public updateTrackingPosition(lng: number, lat: number): void {
    if (!this.trackingSource) return;

    const features = this.trackingSource.getFeatures();
    if (features.length > 0) {
      const feature = features[0];
      const geometry = feature.getGeometry();
      if (geometry instanceof Point) {
        geometry.setCoordinates(fromLonLat([lng, lat]));
      }

      // 更新视图位置
      if (this.map) {
        const view = this.map.getView();
        view?.animate({
          center: fromLonLat([lng, lat]),
          duration: 500,
        });
      }
    }
  }
}

// 导出单例
export const mapService = new MapService();
export default mapService;
