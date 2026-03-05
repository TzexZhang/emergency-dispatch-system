/**
 * ============================================
 * 事件地图页面
 * ============================================
 *
 * 功能说明：
 * - 在地图上可视化展示事件分布和状态
 * - 事件标记：在地图上标记事件位置
 * - 事件状态显示：不同颜色表示不同状态
 * - 事件详情查看：点击标记查看事件信息
 * - 事件范围标注：划定事件影响范围
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Select,
  Tag,
  Space,
  Spin,
  Empty,
  Button,
  Modal,
  Descriptions,
  Badge,
} from "antd";
import {
  FireOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  CarOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { http } from "@utils/http";
import MapContainer from "@components/Map/MapContainer";
import type {
  IncidentListItem,
  IncidentType,
  IncidentLevel,
  IncidentStatus,
} from "@/types";
import "./IncidentMap.less";

const INCIDENT_TYPES: { label: string; value: IncidentType }[] = [
  { label: "全部", value: "" as IncidentType },
  { label: "火灾", value: "fire" },
  { label: "交通事故", value: "traffic" },
  { label: "医疗急救", value: "medical" },
  { label: "治安事件", value: "police" },
  { label: "公共安全", value: "public_security" },
  { label: "自然灾害", value: "natural_disaster" },
];

const INCIDENT_LEVELS: { label: string; value: IncidentLevel }[] = [
  { label: "全部", value: "" as IncidentLevel },
  { label: "一般", value: "minor" },
  { label: "重大", value: "major" },
  { label: "特大", value: "severe" },
];

const INCIDENT_STATUSES: { label: string; value: IncidentStatus }[] = [
  { label: "全部", value: "" as IncidentStatus },
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已解决", value: "resolved" },
  { label: "已关闭", value: "closed" },
];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  pending: "#faad14",
  processing: "#1890ff",
  resolved: "#52c41a",
  closed: "#8c8c8c",
};

const LEVEL_COLORS: Record<IncidentLevel, string> = {
  minor: "#52c41a",
  major: "#faad14",
  severe: "#ff4d4f",
};

/**
 * 事件地图页面组件
 */
const IncidentMap: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<
    IncidentListItem[]
  >([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    resolved: 0,
    closed: 0,
  });

  // 筛选条件
  const [filterType, setFilterType] = useState<IncidentType | "">("");
  const [filterLevel, setFilterLevel] = useState<IncidentLevel | "">("");
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | "">("");

  // 事件详情弹窗
  const [selectedIncident, setSelectedIncident] =
    useState<IncidentListItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  /**
   * 获取事件列表 - 全量数据用于地图显示
   */
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{ list: IncidentListItem[]; total: number }>(
        "/api/v1/incidents",
        {
          params: { page: 1, pageSize: 50000 }, // 全量数据
        },
      );
      if (res?.data) {
        const list = res.data.list || [];
        setIncidents(list);

        // 计算统计
        const newStats = {
          total: list.length,
          pending: list.filter((i) => i.status === "pending").length,
          processing: list.filter((i) => i.status === "processing").length,
          resolved: list.filter((i) => i.status === "resolved").length,
          closed: list.filter((i) => i.status === "closed").length,
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error("获取事件列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 应用筛选
   */
  useEffect(() => {
    let filtered = [...incidents];

    if (filterType) {
      filtered = filtered.filter((i) => i.type === filterType);
    }
    if (filterLevel) {
      filtered = filtered.filter((i) => i.level === filterLevel);
    }
    if (filterStatus) {
      filtered = filtered.filter((i) => i.status === filterStatus);
    }

    setFilteredIncidents(filtered);
  }, [incidents, filterType, filterLevel, filterStatus]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  /**
   * 获取事件类型图标
   */
  const getTypeIcon = (type: IncidentType) => {
    switch (type) {
      case "fire":
        return <FireOutlined style={{ color: "#ff4d4f" }} />;
      case "medical":
        return <MedicineBoxOutlined style={{ color: "#52c41a" }} />;
      case "traffic":
        return <CarOutlined style={{ color: "#1890ff" }} />;
      case "public_security":
        return <SafetyOutlined style={{ color: "#722ed1" }} />;
      default:
        return <WarningOutlined style={{ color: "#faad14" }} />;
    }
  };

  /**
   * 获取事件类型名称
   */
  const getTypeName = (type: IncidentType) => {
    const item = INCIDENT_TYPES.find((t) => t.value === type);
    return item?.label || type;
  };

  /**
   * 获取事件等级名称
   */
  const getLevelName = (level: IncidentLevel) => {
    const item = INCIDENT_LEVELS.find((l) => l.value === level);
    return item?.label || level;
  };

  /**
   * 获取事件状态名称
   */
  const getStatusName = (status: IncidentStatus) => {
    const item = INCIDENT_STATUSES.find((s) => s.value === status);
    return item?.label || status;
  };

  /**
   * 处理事件点击
   */
  const handleIncidentClick = (incident: IncidentListItem) => {
    setSelectedIncident(incident);
    setModalVisible(true);
  };

  /**
   * 将事件转换为地图资源格式
   * 注意：typeCode 用于地图服务识别事件类型并显示对应图标
   * 地图显示全量事件数据，不受筛选条件影响
   */
  const mapResources = incidents
    .filter((i) => i.latitude && i.longitude)
    .map((incident) => ({
      id: incident.id,
      resourceTypeId: incident.type,
      typeCode: `incident_${incident.type}`, // 添加事件类型标识，用于地图图标识别
      resourceName: incident.title,
      resourceStatus: incident.status as any,
      longitude: Number(incident.longitude),
      latitude: Number(incident.latitude),
      typeName: getTypeName(incident.type),
      properties: {
        level: incident.level,
        type: incident.type,
        status: incident.status,
        description: incident.description,
      },
    }));

  if (loading) {
    return (
      <div className="incident-map-loading">
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#888" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="incident-map-page">
      {/* 筛选区域 */}
      <Card className="filter-card" size="small">
        <Space size="middle" wrap>
          <Space>
            <span className="filter-label">事件类型:</span>
            <Select
              value={filterType}
              onChange={setFilterType}
              options={INCIDENT_TYPES}
              style={{ width: 120 }}
              allowClear
              placeholder="全部"
            />
          </Space>
          <Space>
            <span className="filter-label">事件等级:</span>
            <Select
              value={filterLevel}
              onChange={setFilterLevel}
              options={INCIDENT_LEVELS}
              style={{ width: 120 }}
              allowClear
              placeholder="全部"
            />
          </Space>
          <Space>
            <span className="filter-label">处理状态:</span>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={INCIDENT_STATUSES}
              style={{ width: 120 }}
              allowClear
              placeholder="全部"
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchIncidents}>
            刷新
          </Button>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <div className="stats-row">
        <Card className="stat-card" size="small">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">事件总数</span>
          </div>
        </Card>
        <Card className="stat-card pending" size="small">
          <div className="stat-item">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">待处理</span>
          </div>
        </Card>
        <Card className="stat-card processing" size="small">
          <div className="stat-item">
            <span className="stat-value">{stats.processing}</span>
            <span className="stat-label">处理中</span>
          </div>
        </Card>
        <Card className="stat-card resolved" size="small">
          <div className="stat-item">
            <span className="stat-value">{stats.resolved}</span>
            <span className="stat-label">已解决</span>
          </div>
        </Card>
        <Card className="stat-card closed" size="small">
          <div className="stat-item">
            <span className="stat-value">{stats.closed}</span>
            <span className="stat-label">已关闭</span>
          </div>
        </Card>
      </div>

      {/* 地图区域 */}
      <div className="map-wrapper">
        {mapResources.length > 0 ? (
          <MapContainer
            key={`incident-map-${mapResources.length}`}
            resources={mapResources}
            useCluster={true}
            useWebGL={false}
            onResourceClick={(resource) => {
              const incident = filteredIncidents.find(
                (i) => i.id === resource.id,
              );
              if (incident) {
                handleIncidentClick(incident);
              }
            }}
          />
        ) : (
          <Empty description="暂无事件数据" style={{ marginTop: 100 }} />
        )}
      </div>

      {/* 事件详情弹窗 */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined />
            事件详情
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedIncident && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="事件ID" span={2}>
              {selectedIncident.id}
            </Descriptions.Item>
            <Descriptions.Item label="事件类型">
              <Space>
                {getTypeIcon(selectedIncident.type)}
                {getTypeName(selectedIncident.type)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="事件等级">
              <Tag color={LEVEL_COLORS[selectedIncident.level]}>
                {getLevelName(selectedIncident.level)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="事件标题" span={2}>
              {selectedIncident.title}
            </Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Badge
                color={STATUS_COLORS[selectedIncident.status]}
                text={getStatusName(selectedIncident.status)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="发生地点">
              {selectedIncident.location || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="经纬度" span={2}>
              {Number(selectedIncident.latitude)?.toFixed(6) || "-"},{" "}
              {Number(selectedIncident.longitude)?.toFixed(6) || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="上报人">
              {selectedIncident.reporterName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="处理人">
              {selectedIncident.assigneeName || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="上报时间">
              {selectedIncident.reportedAt}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {selectedIncident.createdAt}
            </Descriptions.Item>
            <Descriptions.Item label="事件描述" span={2}>
              {selectedIncident.description || "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default IncidentMap;
