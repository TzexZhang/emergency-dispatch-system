/**
 * ============================================
 * 地图容器组件
 * ============================================
 *
 * 功能说明：
 * - OpenLayers地图初始化
 * - 图层管理
 * - 资源点位渲染
 *
 * @author Emergency Dispatch Team
 */

import { useEffect, useRef } from 'react';
import { mapService } from '@services/map.service';
import { config } from '@/config';
import type { Resource } from '@/types';
import 'ol/ol.css';

interface MapContainerProps {
  resources: Resource[];
}

/**
 * 地图容器组件
 */
const MapContainer: React.FC<MapContainerProps> = ({ resources }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInitializedRef.current) {
      return;
    }

    // 初始化地图
    try {
      mapService.initMap({
        target: mapContainerRef.current,
        center: config.map.defaultCenter,
        zoom: config.map.defaultZoom,
        minZoom: config.map.minZoom,
        maxZoom: config.map.maxZoom,
      });
      mapInitializedRef.current = true;
    } catch (error) {
      // 静默处理错误
    }

    return () => {
      mapService.destroy();
      mapInitializedRef.current = false;
    };
    // 只在组件挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当资源变化时，可以在这里更新地图图层
  useEffect(() => {
    if (mapInitializedRef.current) {
      // TODO: 添加资源点位到地图
    }
  }, [resources]);

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    />
  );
};

export default MapContainer;
