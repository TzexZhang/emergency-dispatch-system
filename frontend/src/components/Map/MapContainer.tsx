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

import { useEffect, useRef } from "react";
import { mapService } from "@services/map.service";
import { config } from "@/config";
import type { Resource } from "@/types";
import "ol/ol.css";

interface MapContainerProps {
  resources?: Resource[];
  useCluster?: boolean;
  useWebGL?: boolean;
  onResourceClick?: (resource: Resource) => void;
}

const MapContainer: React.FC<MapContainerProps> = ({
  resources = [],
  useCluster = true,
  useWebGL = false,
  onResourceClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const prevUseClusterRef = useRef(useCluster);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const initAttemptedRef = useRef(false);

  // 地图初始化 - 只执行一次
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || initAttemptedRef.current) return;

    initAttemptedRef.current = true;
    let retryCount = 0;
    const maxRetries = 50;

    const tryInit = () => {
      const currentContainer = mapContainerRef.current;
      if (!currentContainer) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryInit, 100);
        }
        return;
      }

      const rect = currentContainer.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        doInit();
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryInit, 100);
      } else {
        // 最后一次尝试，强制初始化
        console.warn("Map container size is 0, force initializing...");
        doInit();
      }
    };

    const doInit = () => {
      mapService.initMap(
        {
          target: mapContainerRef.current!,
          center: config.map.defaultCenter,
          zoom: config.map.defaultZoom,
          minZoom: config.map.minZoom,
          maxZoom: config.map.maxZoom,
        },
        useCluster,
        useWebGL,
      );
      prevUseClusterRef.current = useCluster;

      // 延迟触发尺寸更新，确保瓦片加载
      setTimeout(() => {
        mapService.updateSize();
        mapService.getMap()?.render();
      }, 200);

      // 监听尺寸变化
      resizeObserverRef.current = new ResizeObserver(() => {
        mapService.updateSize();
      });
      if (mapContainerRef.current) {
        resizeObserverRef.current.observe(mapContainerRef.current);
      }
    };

    // 延迟初始化，确保 DOM 完全渲染
    requestAnimationFrame(() => {
      setTimeout(tryInit, 50);
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      mapService.clearResources();
      mapService.destroy();
      initAttemptedRef.current = false;
    };
  }, []);

  // 处理资源点击
  useEffect(() => {
    if (!onResourceClick) return;

    mapService.onResourceClick((feature) => {
      let resourceId = feature.get("id");
      if (!resourceId) {
        const data = feature.get("data");
        if (data && data.id) {
          resourceId = data.id;
        }
      }
      const resource = resources.find((r) => r.id === resourceId);
      if (resource) {
        onResourceClick(resource);
      }
    });
  }, [resources, onResourceClick]);

  // 处理聚合模式切换
  useEffect(() => {
    if (useCluster !== prevUseClusterRef.current) {
      if (useCluster) {
        mapService.enableCluster();
      } else {
        mapService.disableCluster();
      }
      prevUseClusterRef.current = useCluster;
    }
  }, [useCluster]);

  // 更新资源点位 - 确保地图已初始化后再更新
  useEffect(() => {
    // 使用 onMapReady 确保地图已初始化完成后再更新资源
    mapService.onMapReady(() => {
      if (resources.length > 0) {
        mapService.updateResources(resources);
      } else {
        mapService.clearResources();
      }
    }, 10000); // 最多等待10秒
  }, [resources]);

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
      }}
    />
  );
};

export default MapContainer;
