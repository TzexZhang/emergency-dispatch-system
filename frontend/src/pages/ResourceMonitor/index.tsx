/**
 * ============================================
 * 资源实时监控页面
 * ============================================
 *
 * 功能说明：
 * - 地图实时展示资源位置
 * - 资源状态统计面板
 * - 资源列表（支持筛选）
 * - WebSocket实时位置更新
 * - 资源详情查看
 * - 资源追踪功能
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Input,
  Select,
  Space,
  Button,
  Badge,
  Drawer,
  Descriptions,
  App,
  Tooltip,
  Switch,
  Typography,
  Empty,
  Spin,
} from "antd";
import {
  EnvironmentOutlined,
  SearchOutlined,
  ReloadOutlined,
  AimOutlined,
  EyeOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { http } from "@/utils/http";
import { wsService } from "@/services/websocket.service";
import { mapService } from "@/services/map.service";
import { getToken } from "@/store/userStore";
import MapContainer from "@components/Map/MapContainer";
import type {
  Resource,
  ResourceStatus,
  ResourceUpdate,
  ResourceType,
} from "@/types";
import type { ColumnsType } from "antd/es/table";
import "./index.less";

const { Title, Text } = Typography;

// 状态配置
const STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  online: { label: "在线", color: "success", icon: <CheckCircleOutlined /> },
  offline: { label: "离线", color: "default", icon: <CloseCircleOutlined /> },
  alarm: { label: "告警", color: "error", icon: <WarningOutlined /> },
  processing: {
    label: "处理中",
    color: "processing",
    icon: <SyncOutlined spin />,
  },
};

// 资源类型图标配置 - 国际通用标准图标
const RESOURCE_TYPE_ICONS: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  ambulance: {
    icon: <span style={{ fontSize: 16 }}>🚑</span>,
    color: "#FF0000",
    label: "救护车",
  },
  fire_truck: {
    icon: <span style={{ fontSize: 16 }}>🚒</span>,
    color: "#FF6600",
    label: "消防车",
  },
  police_car: {
    icon: <span style={{ fontSize: 16 }}>🚓</span>,
    color: "#0000FF",
    label: "警车",
  },
  sensor: {
    icon: <span style={{ fontSize: 16 }}>📡</span>,
    color: "#00FF00",
    label: "传感器",
  },
  person: {
    icon: <span style={{ fontSize: 16 }}>👤</span>,
    color: "#0066FF",
    label: "人员",
  },
};

/**
 * 资源实时监控页面组件
 */
const ResourceMonitor: React.FC = () => {
  const { message } = App.useApp();

  // 资源数据状态
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(false);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    alarm: 0,
    processing: 0,
  });

  // 筛选条件
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");

  // 选中的资源
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [drawerVisible, setDrawerVisible] = useState(false);

  // 追踪模式
  const [trackingResource, setTrackingResource] = useState<Resource | null>(
    null,
  );
  const [autoRefresh, setAutoRefresh] = useState(true);

  // WebSocket连接状态
  const [wsConnected, setWsConnected] = useState(false);

  // 刷新定时器
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * 获取资源列表 - 全量数据用于地图显示
   */
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{ list: Resource[]; total: number }>(
        "/api/v1/resources",
        {
          params: { page: 1, pageSize: 50000 }, // 全量数据
        },
      );

      if (res?.data) {
        const list = res.data.list || [];
        setResources(list);
        updateStats(list);
      }
    } catch (error) {
      message.error("获取资源列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  /**
   * 获取资源类型
   */
  const fetchResourceTypes = useCallback(async () => {
    try {
      const res = await http.get<ResourceType[]>("/api/v1/resources/types");
      if (res?.data) {
        setResourceTypes(res.data);
      }
    } catch (error) {
      console.error("获取资源类型失败", error);
    }
  }, []);

  /**
   * 获取资源统计
   */
  const fetchStats = useCallback(async () => {
    try {
      const res = await http.get<{
        total: number;
        online: number;
        offline: number;
        alarm: number;
        byType: any[];
      }>("/api/v1/resources/stats");

      if (res?.data) {
        setStats({
          total: res.data.total || 0,
          online: res.data.online || 0,
          offline: res.data.offline || 0,
          alarm: res.data.alarm || 0,
          processing: 0,
        });
      }
    } catch (error) {
      console.error("获取统计失败", error);
    }
  }, []);

  /**
   * 更新统计（从资源列表计算）
   */
  const updateStats = (list: Resource[]) => {
    const newStats = {
      total: list.length,
      online: list.filter((r) => r.resourceStatus === "online").length,
      offline: list.filter((r) => r.resourceStatus === "offline").length,
      alarm: list.filter((r) => r.resourceStatus === "alarm").length,
      processing: list.filter((r) => r.resourceStatus === "processing").length,
    };
    setStats(newStats);
  };

  /**
   * 筛选资源
   */
  const filterResources = useCallback(() => {
    let result = [...resources];

    // 状态筛选
    if (statusFilter !== "all") {
      result = result.filter((r) => r.resourceStatus === statusFilter);
    }

    // 类型筛选
    if (typeFilter !== "all") {
      result = result.filter((r) => r.resourceTypeId === typeFilter);
    }

    // 关键词搜索
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.resourceName?.toLowerCase().includes(kw) ||
          r.resourceCode?.toLowerCase().includes(kw),
      );
    }

    setFilteredResources(result);
  }, [resources, statusFilter, typeFilter, keyword]);

  /**
   * 处理WebSocket资源更新
   */
  const handleResourceUpdate = useCallback(
    (data: ResourceUpdate) => {
      setResources((prev) => {
        const index = prev.findIndex((r) => r.id === data.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            longitude: data.lng,
            latitude: data.lat,
            resourceStatus: data.status as ResourceStatus,
            ...data.properties,
          };
          updateStats(updated);
          return updated;
        }
        return prev;
      });

      // 如果正在追踪该资源，显示通知
      if (trackingResource?.id === data.id) {
        message.info(`资源 ${trackingResource.resourceName} 位置已更新`);
      }
    },
    [trackingResource, message],
  );

  /**
   * 初始化WebSocket
   */
  const initWebSocket = useCallback(() => {
    const token = getToken();
    if (!token) return;

    wsService.connect(token);

    // 监听资源更新
    wsService.on<ResourceUpdate>("resource:update", handleResourceUpdate);

    // 监听连接状态
    const checkConnection = setInterval(() => {
      setWsConnected(wsService.getConnectionStatus());
    }, 2000);

    return () => {
      clearInterval(checkConnection);
      wsService.off("resource:update", handleResourceUpdate);
    };
  }, [handleResourceUpdate]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    fetchResources();
    fetchResourceTypes();
    fetchStats();
    const cleanup = initWebSocket();

    return () => {
      cleanup?.();
      mapService.clearTracking();
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchResources, fetchResourceTypes, fetchStats, initWebSocket]);

  /**
   * 自动刷新定时器
   */
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchStats();
      }, 30000); // 30秒刷新一次统计
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, fetchStats]);

  /**
   * 筛选条件变化时重新筛选
   */
  useEffect(() => {
    filterResources();
  }, [filterResources]);

  /**
   * 查看资源详情
   */
  const handleViewDetail = (record: Resource) => {
    setSelectedResource(record);
    setDrawerVisible(true);
  };

  /**
   * 追踪资源
   */
  const handleTrackResource = (record: Resource) => {
    if (trackingResource?.id === record.id) {
      setTrackingResource(null);
      mapService.clearTracking();
      message.info(`已取消追踪 ${record.resourceName}`);
    } else {
      setTrackingResource(record);
      mapService.highlightTrackingResource(record);
      message.success(`开始追踪 ${record.resourceName}`);
    }
  };

  /**
   * 表格列配置
   */
  const columns: ColumnsType<Resource> = [
    {
      title: "资源名称",
      dataIndex: "resourceName",
      key: "resourceName",
      width: 180,
      ellipsis: true,
      render: (text: string, record: Resource) => {
        const typeConfig = RESOURCE_TYPE_ICONS[record.typeCode || ""];
        return (
          <Space>
            {trackingResource?.id === record.id && (
              <AimOutlined style={{ color: "#1890ff" }} />
            )}
            {typeConfig?.icon}
            <span>{text}</span>
          </Space>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "resourceStatus",
      key: "resourceStatus",
      width: 100,
      render: (status: ResourceStatus) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "类型",
      dataIndex: "typeName",
      key: "typeName",
      width: 100,
      render: (typeName: string, record: Resource) => {
        const typeConfig = RESOURCE_TYPE_ICONS[record.typeCode || ""];
        return (
          <Space>
            {typeConfig?.icon}
            <span>{typeName}</span>
          </Space>
        );
      },
    },
    {
      title: "速度",
      dataIndex: "speed",
      key: "speed",
      width: 80,
      render: (speed: number | string) =>
        speed != null ? `${Number(speed).toFixed(1)} km/h` : "-",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 150,
      render: (time: string) =>
        time ? new Date(time).toLocaleString("zh-CN") : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_: any, record: Resource) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip
            title={trackingResource?.id === record.id ? "取消追踪" : "追踪"}
          >
            <Button
              type="link"
              size="small"
              icon={
                trackingResource?.id === record.id ? (
                  <StopOutlined />
                ) : (
                  <AimOutlined />
                )
              }
              onClick={() => handleTrackResource(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="resource-monitor">
      {/* 统计面板 */}
      <Row gutter={0} className="stats-row">
        <Col span={4}>
          <Card className="stat-card stat-total" variant="borderless">
            <Statistic
              title="资源总数"
              value={stats.total}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card online" variant="borderless">
            <Statistic
              title="在线"
              value={stats.online}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card offline" variant="borderless">
            <Statistic
              title="离线"
              value={stats.offline}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card alarm" variant="borderless">
            <Statistic
              title="告警"
              value={stats.alarm}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card processing" variant="borderless">
            <Statistic
              title="处理中"
              value={stats.processing}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card connection" variant="borderless">
            <div className="connection-status">
              <Text type="secondary">WebSocket</Text>
              <Badge
                status={wsConnected ? "success" : "error"}
                text={wsConnected ? "已连接" : "未连接"}
              />
              <div className="auto-refresh">
                <Text type="secondary">自动刷新</Text>
                <Switch
                  size="small"
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主内容区 */}
      <Row gutter={16} className="main-content">
        {/* 地图区域 */}
        <Col span={16}>
          <Card
            className="map-card"
            styles={{ body: { padding: 0, height: "calc(100% - 57px)" } }}
          >
            <div className="map-header">
              <Title level={5}>
                <EnvironmentOutlined /> 资源分布地图
                {trackingResource && (
                  <Tag
                    color="processing"
                    style={{ marginLeft: 8, cursor: "pointer" }}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      handleTrackResource(trackingResource);
                    }}
                  >
                    <AimOutlined style={{ marginRight: 4 }} />
                    追踪: {trackingResource.resourceName}
                  </Tag>
                )}
              </Title>
            </div>
            <div className="map-wrapper">
              <MapContainer
                key={`resource-monitor-${trackingResource?.id || "list"}-${resources.length}`}
                resources={trackingResource ? [trackingResource] : resources}
                useCluster={!trackingResource}
                onResourceClick={(resource) => {
                  setSelectedResource(resource);
                  setDrawerVisible(true);
                }}
              />
              {/* 加载状态覆盖层 */}
              {loading && (
                <div className="map-loading">
                  <Spin size="large">
                    <div style={{ padding: 50 }}>加载中...</div>
                  </Spin>
                </div>
              )}
              {/* 空数据提示 */}
              {resources.length === 0 && !loading && !trackingResource && (
                <div className="map-empty-overlay">
                  <Empty description="暂无资源数据" />
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 右侧面板 */}
        <Col span={8}>
          <Card className="list-card">
            {/* 筛选区域 */}
            <div className="filter-section">
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
                <Input
                  placeholder="搜索资源名称或编码"
                  prefix={<SearchOutlined />}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  allowClear
                />
                <Space style={{ width: "100%" }}>
                  <Select
                    style={{ width: 120 }}
                    placeholder="状态"
                    value={statusFilter}
                    onChange={setStatusFilter}
                  >
                    <Select.Option value="all">全部状态</Select.Option>
                    <Select.Option value="online">在线</Select.Option>
                    <Select.Option value="offline">离线</Select.Option>
                    <Select.Option value="alarm">告警</Select.Option>
                    <Select.Option value="processing">处理中</Select.Option>
                  </Select>
                  <Select
                    style={{ width: 120 }}
                    placeholder="类型"
                    value={typeFilter}
                    onChange={setTypeFilter}
                  >
                    <Select.Option value="all">全部类型</Select.Option>
                    {resourceTypes.map((type) => (
                      <Select.Option key={type.id} value={type.id}>
                        {type.typeName}
                      </Select.Option>
                    ))}
                  </Select>
                  <Button icon={<ReloadOutlined />} onClick={fetchResources}>
                    刷新
                  </Button>
                </Space>
              </Space>
            </div>

            {/* 资源列表 */}
            <div className="resource-list">
              <Table<Resource>
                columns={columns}
                dataSource={filteredResources}
                rowKey="id"
                size="small"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条`,
                }}
                scroll={{ y: 400 }}
                loading={loading}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 资源详情抽屉 */}
      <Drawer
        title="资源详情"
        placement="right"
        width={450}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedResource && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="资源ID">
              {selectedResource.id}
            </Descriptions.Item>
            <Descriptions.Item label="资源名称">
              {selectedResource.resourceName}
            </Descriptions.Item>
            <Descriptions.Item label="资源编码">
              {selectedResource.resourceCode || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                color={STATUS_CONFIG[selectedResource.resourceStatus]?.color}
              >
                {STATUS_CONFIG[selectedResource.resourceStatus]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="类型">
              {selectedResource.typeName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="所属部门">
              {selectedResource.departmentName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="经度">
              {selectedResource.longitude
                ? Number(selectedResource.longitude).toFixed(6)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="纬度">
              {selectedResource.latitude
                ? Number(selectedResource.latitude).toFixed(6)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="速度">
              {selectedResource.speed
                ? `${Number(selectedResource.speed).toFixed(2)} km/h`
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="方向">
              {selectedResource.direction
                ? `${Number(selectedResource.direction).toFixed(0)}°`
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {selectedResource.updatedAt
                ? new Date(selectedResource.updatedAt).toLocaleString("zh-CN")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default ResourceMonitor;
