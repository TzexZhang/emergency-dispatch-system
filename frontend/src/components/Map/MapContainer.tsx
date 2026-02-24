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
import { config } from '@config';
import type { Resource } from '@types';
import 'ol/ol.css';

interface MapContainerProps {
  resources: Resource[];
}

/**
 * 地图容器组件
 */
const MapContainer: React.FC<MapContainerProps> = ({ resources }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 初始化地图
    const map = mapService.initMap({
      target: mapContainerRef.current!,
      center: config.map.defaultCenter,
      zoom: config.map.defaultZoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom,
    });

    return () => {
      mapService.destroy();
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default MapContainer;
