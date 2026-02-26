/**
 * ============================================
 * 地图容器组件
 * ============================================
 *
 * 功能说明：
 * - OpenLayers地图初始化
 * - 图层管理
 * - 资源点位渲染
 * - 实时位置更新
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

const MapContainer: React.FC<MapContainerProps> = ({ resources }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitializedRef = useRef(false);
  const prevResourcesRef = useRef<Resource[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInitializedRef.current) {
      return;
    }

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
      console.error('地图初始化失败:', error);
    }

    return () => {
      mapService.clearResources();
      mapService.destroy();
      mapInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mapInitializedRef.current) return;

    const prevResources = prevResourcesRef.current;
    const prevMap = new Map(prevResources.map((r) => [r.id, r]));

    const hasChanged =
      resources.length !== prevResources.length ||
      resources.some((r) => {
        const prev = prevMap.get(r.id);
        return (
          !prev ||
          prev.longitude !== r.longitude ||
          prev.latitude !== r.latitude ||
          prev.resourceStatus !== r.resourceStatus
        );
      });

    if (hasChanged) {
      mapService.updateResources(resources);
      prevResourcesRef.current = resources;
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
