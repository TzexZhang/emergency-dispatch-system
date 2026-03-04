/**
 * ============================================
 * 地理编码搜索组件
 * ============================================
 *
 * 功能说明：
 * - 基于 Nominatim API 实现地址搜索
 * - 支持精确到街道级别的位置搜索
 * - 提供搜索结果下拉列表
 * - 支持中国行政区划优先
 *
 * @author Emergency Dispatch Team
 */

import { useState, useCallback, useRef } from "react";
import { Input, Spin, Empty, App } from "antd";
import { SearchOutlined, EnvironmentOutlined } from "@ant-design/icons";
import debounce from "lodash/debounce";
import "./GeocoderSearch.less";

/**
 * 地理编码搜索结果项
 */
export interface GeocoderResult {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  address: {
    country?: string;
    state?: string;
    city?: string;
    county?: string;
    suburb?: string;
    street?: string;
    houseNumber?: string;
    postcode?: string;
  };
}

interface GeocoderSearchProps {
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  onSelect: (result: GeocoderResult) => void;
  defaultValue?: string;
}

// Nominatim API 配置
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const SEARCH_DELAY = 500; // 防抖延迟
const MIN_SEARCH_LENGTH = 2; // 最小搜索字符数

/**
 * 地理编码搜索组件
 */
const GeocoderSearch: React.FC<GeocoderSearchProps> = ({
  placeholder = "搜索地址（精确到街道）",
  style,
  className,
  onSelect,
  defaultValue = "",
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocoderResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchValue, setSearchValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 调用 Nominatim API 进行地址搜索
   */
  const searchAddress = async (query: string) => {
    if (query.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 使用 Nominatim 搜索 API，限制在中国区域
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "10",
        // 限制搜索范围为中国区域（可根据需要调整）
        bounded: "0",
        // 接受语言
        "accept-language": "zh-CN,zh,en",
      });

      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
        {
          headers: {
            "User-Agent": "EmergencyDispatchSystem/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("搜索服务暂不可用");
      }

      const data = await response.json();

      const formattedResults: GeocoderResult[] = data.map((item: any) => ({
        placeId: item.place_id,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type,
        address: {
          country: item.address?.country,
          state: item.address?.state || item.address?.province,
          city: item.address?.city || item.address?.town || item.address?.village,
          county: item.address?.county,
          suburb: item.address?.suburb || item.address?.district,
          street: item.address?.road || item.address?.street,
          houseNumber: item.address?.house_number,
          postcode: item.address?.postcode,
        },
      }));

      setResults(formattedResults);
      setShowResults(true);
    } catch (error) {
      console.error("地址搜索失败:", error);
      message.warning("地址搜索失败，请稍后重试");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 防抖搜索
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchAddress(query);
    }, SEARCH_DELAY),
    []
  );

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (value.length >= MIN_SEARCH_LENGTH) {
      debouncedSearch(value);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  /**
   * 处理选择结果
   */
  const handleSelect = (result: GeocoderResult) => {
    setSearchValue(result.displayName);
    setShowResults(false);
    onSelect(result);
  };

  /**
   * 处理失焦
   */
  const handleBlur = () => {
    // 延迟隐藏，允许点击搜索结果
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  /**
   * 处理聚焦
   */
  const handleFocus = () => {
    if (results.length > 0) {
      setShowResults(true);
    }
  };

  /**
   * 格式化显示地址
   */
  const formatAddress = (result: GeocoderResult) => {
    const addr = result.address;
    const parts: string[] = [];

    if (addr.country) parts.push(addr.country);
    if (addr.state) parts.push(addr.state);
    const cityOrCounty = addr.city || addr.county;
    if (cityOrCounty) parts.push(cityOrCounty);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.street) parts.push(addr.street);
    if (addr.houseNumber) parts.push(addr.houseNumber);

    return parts.length > 0 ? parts.join(" ") : result.displayName;
  };

  return (
    <div
      ref={containerRef}
      className={`geocoder-search ${className || ""}`}
      style={style}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder={placeholder}
        value={searchValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        suffix={loading ? <Spin size="small" /> : null}
        allowClear
      />

      {showResults && (
        <div className="geocoder-results">
          {loading ? (
            <div className="geocoder-loading">
              <Spin size="small" />
              <span>搜索中...</span>
            </div>
          ) : results.length > 0 ? (
            <ul className="geocoder-list">
              {results.map((result) => (
                <li
                  key={result.placeId}
                  className="geocoder-item"
                  onClick={() => handleSelect(result)}
                >
                  <EnvironmentOutlined className="geocoder-icon" />
                  <div className="geocoder-content">
                    <div className="geocoder-name">
                      {formatAddress(result)}
                    </div>
                    <div className="geocoder-coords">
                      经度: {result.lon.toFixed(6)}, 纬度: {result.lat.toFixed(6)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : searchValue.length >= MIN_SEARCH_LENGTH ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到匹配地址"
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default GeocoderSearch;
