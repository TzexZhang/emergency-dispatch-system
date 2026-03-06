/**
 * ============================================
 * 地图控件组件
 * ============================================
 *
 * 功能说明：
 * - 缩放等级显示
 * - 地点搜索（支持中国行政区）
 * - 飞转到指定位置
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useCallback } from "react";
import { Input, AutoComplete, Space, Tag, Tooltip } from "antd";
import {
  SearchOutlined,
  AimOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { mapService } from "@services/map.service";
import { searchRegions, type Region } from "@/data/chinaRegions";
import "./MapControls.less";

interface MapControlsProps {
  onFlyTo?: (region: Region) => void;
  onLocationChange?: (location: {
    name: string;
    lng: number;
    lat: number;
    zoom: number;
  }) => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onFlyTo,
  onLocationChange,
}) => {
  const [zoom, setZoom] = useState<number>(12);
  const [searchValue, setSearchValue] = useState("");
  const [searchOptions, setSearchOptions] = useState<
    { value: string; label: React.ReactNode; region: Region }[]
  >([]);
  const [currentLocation, setCurrentLocation] = useState<{
    name: string;
    lng: number;
    lat: number;
  } | null>(null);

  // 监听缩放级别变化
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // 等待地图就绪后绑定监听器
    const setupZoomListener = () => {
      unsubscribe = mapService.onZoomChange((newZoom) => {
        setZoom(Math.round(newZoom * 10) / 10);
      });

      // 获取初始缩放级别
      const initialZoom = mapService.getZoom();
      if (initialZoom !== undefined) {
        setZoom(Math.round(initialZoom * 10) / 10);
      }
    };

    // 如果地图已就绪，直接绑定；否则等待就绪
    if (mapService.isMapReady()) {
      setupZoomListener();
    } else {
      mapService.onMapReady(setupZoomListener, 10000);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);

    if (!value.trim()) {
      setSearchOptions([]);
      return;
    }

    const results = searchRegions(value);
    const options = results.slice(0, 10).map((region) => ({
      value: region.name,
      label: (
        <div className="search-option">
          <Space>
            <AimOutlined style={{ color: "#1890ff" }} />
            <span className="search-option-name">{region.name}</span>
            <Tag
              color={
                region.type === "province"
                  ? "blue"
                  : region.type === "city"
                    ? "green"
                    : "orange"
              }
              style={{ fontSize: 10 }}
            >
              {region.type === "province"
                ? "省/直辖市"
                : region.type === "city"
                  ? "城市"
                  : "区县"}
            </Tag>
          </Space>
        </div>
      ),
      region,
    }));

    setSearchOptions(options);
  }, []);

  // 选择搜索结果
  const handleSelect = useCallback(
    (_value: string, option: { region: Region }) => {
      const region = option.region;

      // 飞转到选定位置
      mapService.flyTo(region.coord, region.zoom ?? 12, 1500);

      // 更新当前位置
      setCurrentLocation({
        name: region.name,
        lng: region.coord[0],
        lat: region.coord[1],
      });

      // 清空搜索
      setSearchValue("");
      setSearchOptions([]);

      // 回调
      onFlyTo?.(region);
      onLocationChange?.({
        name: region.name,
        lng: region.coord[0],
        lat: region.coord[1],
        zoom: region.zoom ?? 12,
      });
    },
    [onFlyTo, onLocationChange],
  );

  // 放大
  const handleZoomIn = useCallback(() => {
    const currentZoom = mapService.getZoom() ?? 12;
    const view = mapService.getMap()?.getView();
    if (view) {
      view.animate({
        zoom: currentZoom + 1,
        duration: 300,
      });
    }
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    const currentZoom = mapService.getZoom() ?? 12;
    const view = mapService.getMap()?.getView();
    if (view) {
      view.animate({
        zoom: Math.max(currentZoom - 1, 1),
        duration: 300,
      });
    }
  }, []);

  return (
    <div className="map-controls">
      {/* 地点搜索 */}
      <div className="map-search">
        <AutoComplete
          value={searchValue}
          options={searchOptions}
          onSearch={handleSearch}
          onSelect={handleSelect as any}
          placeholder="搜索地点（如：北京、上海）"
          style={{ width: 200 }}
          allowClear
        >
          <Input prefix={<SearchOutlined />} size="small" />
        </AutoComplete>
      </div>

      {/* 当前位置显示 */}
      {currentLocation && (
        <div className="current-location">
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          <span>{currentLocation.name}</span>
        </div>
      )}

      {/* 缩放控制 */}
      <div className="zoom-control">
        <Tooltip title="放大">
          <div className="zoom-btn" onClick={handleZoomIn}>
            <ZoomInOutlined />
          </div>
        </Tooltip>
        <div className="zoom-level">
          <span className="zoom-value">{zoom}</span>
          <span className="zoom-label">级</span>
        </div>
        <Tooltip title="缩小">
          <div className="zoom-btn" onClick={handleZoomOut}>
            <ZoomOutOutlined />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default MapControls;
