/**
 * ============================================
 * 位置选择器组件
 * ============================================
 *
 * 功能说明：
 * - 集成地址搜索和地图点击选点
 * - 支持在弹窗中选择位置
 * - 自动回填经纬度坐标
 * - 支持反向地理编码（坐标转地址）
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, InputNumber, Space, Button, Tooltip } from "antd";
import { EnvironmentOutlined, AimOutlined, CheckOutlined } from "@ant-design/icons";
import GeocoderSearch, { type GeocoderResult } from "./GeocoderSearch";
import { mapService } from "@services/map.service";
import { config } from "@/config";
import "ol/ol.css";
import "./LocationPicker.less";

interface LocationPickerProps {
  value?: {
    longitude?: number;
    latitude?: number;
    address?: string;
  };
  onChange?: (value: { longitude: number; latitude: number; address?: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 位置选择器组件
 */
const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = "点击选择位置",
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    longitude: number;
    latitude: number;
    address?: string;
  } | null>(value ? {
    longitude: value.longitude || 0,
    latitude: value.latitude || 0,
    address: value.address,
  } : null);

  // 地图相关
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const clickHandlerRef = useRef<((evt: any) => void) | null>(null);

  /**
   * 打开位置选择弹窗
   */
  const handleOpenModal = () => {
    if (disabled) return;
    setModalVisible(true);
    // 如果有初始值，使用初始位置，否则使用默认中心
    if (value?.longitude && value?.latitude) {
      setSelectedLocation({
        longitude: value.longitude,
        latitude: value.latitude,
        address: value.address,
      });
    } else {
      setSelectedLocation({
        longitude: config.map.defaultCenter[0],
        latitude: config.map.defaultCenter[1],
      });
    }
  };

  /**
   * 关闭弹窗
   */
  const handleCloseModal = () => {
    setModalVisible(false);
    // 清理地图点击事件
    if (clickHandlerRef.current) {
      const map = mapService.getMap();
      if (map) {
        map.un("click", clickHandlerRef.current);
      }
      clickHandlerRef.current = null;
    }
    // 销毁地图
    mapService.destroy();
  };

  /**
   * 确认选择
   */
  const handleConfirm = () => {
    if (selectedLocation) {
      onChange?.({
        longitude: selectedLocation.longitude,
        latitude: selectedLocation.latitude,
        address: selectedLocation.address,
      });
    }
    handleCloseModal();
  };

  /**
   * 处理地址搜索选择
   */
  const handleGeocoderSelect = useCallback((result: GeocoderResult) => {
    const newLocation = {
      longitude: result.lon,
      latitude: result.lat,
      address: result.displayName,
    };
    setSelectedLocation(newLocation);

    // 移动地图到选中的位置
    mapService.flyTo(result.lon, result.lat, 16);

    // 更新地图标记
    updateMapMarker(result.lon, result.lat);
  }, []);

  /**
   * 更新地图标记位置
   */
  const updateMapMarker = useCallback((lng: number, lat: number) => {
    // 清除旧标记
    if (markerRef.current) {
      mapService.removeMarker(markerRef.current);
    }

    // 添加新标记
    markerRef.current = mapService.addMarker(lng, lat, {
      color: "#1890ff",
      scale: 1.2,
    });
  }, []);

  /**
   * 反向地理编码 - 根据坐标获取地址
   */
  const reverseGeocode = async (lng: number, lat: number): Promise<string | undefined> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: "json",
        "accept-language": "zh-CN,zh,en",
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
          headers: {
            "User-Agent": "EmergencyDispatchSystem/1.0",
          },
        }
      );

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error("反向地理编码失败:", error);
      return undefined;
    }
  };

  /**
   * 处理地图点击
   */
  const handleMapClick = useCallback(async (evt: any) => {
    const coords = mapService.toLonLat(evt.coordinate);
    const lng = coords[0];
    const lat = coords[1];

    // 更新选中位置
    setSelectedLocation((prev) => ({
      ...prev,
      longitude: lng,
      latitude: lat,
      address: undefined, // 清除地址，等待反向地理编码
    }));

    // 更新地图标记
    updateMapMarker(lng, lat);

    // 执行反向地理编码
    const address = await reverseGeocode(lng, lat);
    if (address) {
      setSelectedLocation((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        address,
      }));
    }
  }, [updateMapMarker]);

  /**
   * 手动输入坐标
   */
  const handleCoordinateChange = (field: "longitude" | "latitude", val: number | null) => {
    if (val === null) return;

    setSelectedLocation((prev) => {
      if (!prev) return prev;
      const newLocation = {
        ...prev,
        [field]: val,
      };

      // 更新地图标记和视图
      updateMapMarker(newLocation.longitude, newLocation.latitude);
      mapService.setCenter(newLocation.longitude, newLocation.latitude);

      return newLocation;
    });
  };

  /**
   * 初始化地图
   */
  useEffect(() => {
    if (!modalVisible || !mapContainerRef.current) return;

    // 初始化地图
    const center: [number, number] = selectedLocation?.longitude && selectedLocation?.latitude
      ? [selectedLocation.longitude, selectedLocation.latitude]
      : config.map.defaultCenter;

    const zoom = selectedLocation?.longitude ? 15 : config.map.defaultZoom;

    mapService.initMap({
      target: mapContainerRef.current,
      center,
      zoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom,
    });

    // 如果有初始位置，添加标记
    if (selectedLocation?.longitude && selectedLocation?.latitude) {
      updateMapMarker(selectedLocation.longitude, selectedLocation.latitude);
    }

    // 注册地图点击事件
    clickHandlerRef.current = handleMapClick;
    const map = mapService.getMap();
    if (map) {
      map.on("click", handleMapClick);
    }

    return () => {
      if (clickHandlerRef.current) {
        const map = mapService.getMap();
        if (map) {
          map.un("click", clickHandlerRef.current);
        }
      }
    };
  }, [modalVisible, handleMapClick, updateMapMarker]);

  /**
   * 同步外部 value 变化
   */
  useEffect(() => {
    if (value?.longitude && value?.latitude) {
      setSelectedLocation({
        longitude: value.longitude,
        latitude: value.latitude,
        address: value.address,
      });
    }
  }, [value]);

  /**
   * 显示文本
   */
  const displayText = selectedLocation?.address ||
    (selectedLocation?.longitude && selectedLocation?.latitude
      ? `${selectedLocation.longitude.toFixed(6)}, ${selectedLocation.latitude.toFixed(6)}`
      : placeholder);

  return (
    <div className="location-picker">
      <div
        className={`location-picker-trigger ${disabled ? "disabled" : ""}`}
        onClick={handleOpenModal}
      >
        <EnvironmentOutlined className="location-picker-icon" />
        <span className={`location-picker-text ${!selectedLocation ? "placeholder" : ""}`}>
          {displayText}
        </span>
      </div>

      <Modal
        title="选择位置"
        open={modalVisible}
        onCancel={handleCloseModal}
        width={800}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleConfirm}
            disabled={!selectedLocation}
          >
            确认选择
          </Button>,
        ]}
        className="location-picker-modal"
      >
        <div className="location-picker-content">
          {/* 地址搜索 */}
          <div className="location-picker-search">
            <GeocoderSearch
              placeholder="搜索地址（支持街道、建筑、地标）"
              onSelect={handleGeocoderSelect}
            />
          </div>

          {/* 坐标输入 */}
          <div className="location-picker-coords">
            <Space size="middle">
              <div className="coord-item">
                <label>经度:</label>
                <InputNumber
                  value={selectedLocation?.longitude}
                  onChange={(val) => handleCoordinateChange("longitude", val)}
                  precision={6}
                  step={0.0001}
                  style={{ width: 150 }}
                  placeholder="经度"
                />
              </div>
              <div className="coord-item">
                <label>纬度:</label>
                <InputNumber
                  value={selectedLocation?.latitude}
                  onChange={(val) => handleCoordinateChange("latitude", val)}
                  precision={6}
                  step={0.0001}
                  style={{ width: 150 }}
                  placeholder="纬度"
                />
              </div>
              <Tooltip title="定位到当前坐标">
                <Button
                  icon={<AimOutlined />}
                  onClick={() => {
                    if (selectedLocation) {
                      mapService.flyTo(selectedLocation.longitude, selectedLocation.latitude, 16);
                    }
                  }}
                  disabled={!selectedLocation}
                >
                  定位
                </Button>
              </Tooltip>
            </Space>
          </div>

          {/* 地图区域 */}
          <div className="location-picker-map">
            <div ref={mapContainerRef} className="map-container" />
            <div className="map-hint">
              <EnvironmentOutlined /> 点击地图选择位置
            </div>
          </div>

          {/* 当前选中信息 */}
          {selectedLocation && (
            <div className="location-picker-info">
              <div className="info-item">
                <span className="info-label">当前选中:</span>
                <span className="info-value">
                  {selectedLocation.address || "未获取到地址信息"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">坐标:</span>
                <span className="info-value">
                  {selectedLocation.longitude.toFixed(6)}, {selectedLocation.latitude.toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LocationPicker;
