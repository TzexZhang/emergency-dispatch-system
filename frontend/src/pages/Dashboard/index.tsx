/**
 * ============================================
 * 指挥大屏页面
 * ============================================
 *
 * 功能说明：
 * - 全屏地图展示
 * - 资源状态监控
 * - 实时统计面板
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Row,
  Col,
  Statistic,
  Spin,
  Button,
  Modal,
  Descriptions,
  Tag,
  Space,
  Table,
  Card,
  Tabs,
  Drawer,
  Select,
} from "antd";
import {
  EnvironmentOutlined,
  InfoCircleOutlined,
  FireOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import MapContainer from "@components/Map/MapContainer";
import { mapService } from "@services/map.service";
import { http } from "@utils/http";
import { wsService } from "@services/websocket.service";
import "./index.less";
import type { Resource, ResourceUpdate, IncidentNew } from "@/types";

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    alarm: 0,
  });
  const [incidentStats, setIncidentStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    closed: 0,
    severe: 0,
    major: 0,
    minor: 0,
    byType: {} as Record<string, number>,
  });
  const [resources, setResources] = useState<Resource[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showResourceList, setShowResourceList] = useState(false);
  const [useClusterMode, setUseClusterMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "incidents">("map");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [newIncidents, setNewIncidents] = useState<IncidentNew[]>([]);
  const [resourceFilter, setResourceFilter] = useState<{
    status?: string;
    type?: string;
  }>({});
  const wsConnectedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await http.get<{
        total: number;
        online: number;
        offline: number;
        alarm: number;
      }>("/api/v1/resources/stats");
      if (res?.data) {
        setStats(res.data);
      }
    } catch {
      setStats({ total: 0, online: 0, offline: 0, alarm: 0 });
    }
  }, []);

  const fetchIncidentStats = useCallback(async () => {
    try {
      const res = await http.get<{
        total: number;
        pending: number;
        processing: number;
        closed: number;
        severe: number;
        major: number;
        minor: number;
        byType: Record<string, number>;
      }>("/api/v1/incidents/stats");
      if (res?.data) {
        setIncidentStats(res.data);
      }
    } catch {
      setIncidentStats({
        total: 0,
        pending: 0,
        processing: 0,
        closed: 0,
        severe: 0,
        major: 0,
        minor: 0,
        byType: {},
      });
    }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      // 查询全量事件数据用于地图显示
      const res = await http.get<{
        list: any[];
        total: number;
      }>("/api/v1/incidents", {
        params: { page: 1, pageSize: 50000 }, // 全量数据
      });
      if (res?.data?.list) {
        setIncidents(res.data.list);
      }
    } catch (error) {
      console.error("获取事件数据失败:", error);
      setIncidents([]);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      // 查询全量资源数据用于地图显示
      const res = await http.get<{
        list: Resource[];
        total: number;
        page: number;
        pageSize: number;
      }>("/api/v1/resources", {
        params: { page: 1, pageSize: 50000 }, // 全量数据
      });
      if (res?.data?.list) {
        setResources(res.data.list as Resource[]);
      } else {
        setResources([]);
      }
    } catch (error) {
      console.error("获取资源数据失败:", error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResourceUpdate = useCallback(
    (data: ResourceUpdate) => {
      setResources((prev) =>
        prev.map((r) =>
          r.id === data.id
            ? {
                ...r,
                resourceStatus: data.status as Resource["resourceStatus"],
                longitude: data.lng,
                latitude: data.lat,
              }
            : r,
        ),
      );
      fetchStats();
    },
    [fetchStats],
  );

  const handleIncidentNew = useCallback((data: IncidentNew) => {
    setNewIncidents((prev) => [...prev, data]);
  }, []);

  const handleResourceClick = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setModalVisible(true);
  }, []);

  // 过滤后的资源列表
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      if (
        resourceFilter.status &&
        resource.resourceStatus !== resourceFilter.status
      ) {
        return false;
      }
      if (
        resourceFilter.type &&
        resource.resourceTypeId !== resourceFilter.type
      ) {
        return false;
      }
      return true;
    });
  }, [resources, resourceFilter]);

  // 将事件数据转换为地图资源格式 - 确保数据结构与资源一致
  const incidentMapResources = useMemo(() => {
    return incidents
      .filter((i) => i.latitude && i.longitude)
      .map((incident) => ({
        id: incident.id,
        resourceTypeId: incident.type,
        // typeCode 用于地图服务识别是事件还是资源，以及具体类型
        typeCode: `incident_${incident.type}`,
        resourceStatus: incident.status as any,
        resourceName: incident.title,
        longitude: Number(incident.longitude),
        latitude: Number(incident.latitude),
        typeName: incident.type,
        // 事件特有属性
        properties: {
          level: incident.level,
          type: incident.type,
          status: incident.status,
          description: incident.description,
        },
      }));
  }, [incidents]);

  // 合并资源和事件数据用于地图显示
  const mapDisplayData = useMemo(() => {
    return [...resources, ...incidentMapResources];
  }, [resources, incidentMapResources]);

  useEffect(() => {
    fetchStats();
    fetchIncidentStats();
    fetchResources();
    fetchIncidents();

    const token = localStorage.getItem("token");
    if (token) {
      wsService.connect(token);
      wsConnectedRef.current = true;
      wsService.on<ResourceUpdate>("resource:update", handleResourceUpdate);
      wsService.on<IncidentNew>("incident:new", handleIncidentNew);
    }

    return () => {
      if (wsConnectedRef.current) {
        wsService.off("resource:update", handleResourceUpdate);
        wsService.off("incident:new", handleIncidentNew);
        wsService.disconnect();
        wsConnectedRef.current = false;
      }
    };
  }, [
    fetchStats,
    fetchIncidentStats,
    fetchResources,
    fetchIncidents,
    handleResourceUpdate,
    handleIncidentNew,
  ]);

  return (
    <div className="dashboard">
      {/* 统计面板 - 资源状态 */}
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
          <Card className="stat-card stat-online" variant="borderless">
            <Statistic
              title="在线资源"
              value={stats.online}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card stat-offline" variant="borderless">
            <Statistic
              title="离线资源"
              value={stats.offline}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card stat-alarm" variant="borderless">
            <Statistic
              title="告警资源"
              value={stats.alarm}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card stat-processing" variant="borderless">
            <Statistic
              title="处理中事件"
              value={incidentStats.processing}
              prefix={<SyncOutlined spin />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card stat-incident" variant="borderless">
            <Statistic
              title="事件总数"
              value={incidentStats.total}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 事件统计详情 */}
      <Row gutter={0} className="incident-stats-row">
        <Col span={8}>
          <Card className="stat-card-small" variant="borderless">
            <div className="stat-card-small-title">事件类型</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
                gap: 4,
              }}
            >
              <span className="stat-badge fire">
                火灾 {incidentStats.byType.fire || 0}
              </span>
              <span className="stat-badge medical">
                医疗 {incidentStats.byType.medical || 0}
              </span>
              <span className="stat-badge police">
                治安 {incidentStats.byType.public_security || 0}
              </span>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            className="stat-card-small stat-card-level"
            variant="borderless"
          >
            <div className="stat-card-small-title">事件等级</div>
            <div className="stat-level-container">
              <div className="stat-item">
                <span className="stat-value severe">
                  {incidentStats.severe}
                </span>
                <span className="stat-label">严重</span>
              </div>
              <div className="stat-item">
                <span className="stat-value major">{incidentStats.major}</span>
                <span className="stat-label">重大</span>
              </div>
              <div className="stat-item">
                <span className="stat-value minor">{incidentStats.minor}</span>
                <span className="stat-label">一般</span>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card-small" variant="borderless">
            <div className="stat-card-small-title">处理状态</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
                gap: 4,
              }}
            >
              <span className="stat-badge pending">
                待处理 {incidentStats.pending}
              </span>
              <span className="stat-badge processing">
                处理中 {incidentStats.processing}
              </span>
              <span className="stat-badge closed">
                已关闭 {incidentStats.closed}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 新事件提示 */}
      {newIncidents.length > 0 && (
        <Row className="new-incident-row">
          <Col span={24}>
            <Space wrap>
              <span style={{ fontWeight: 500, color: "#d46b08" }}>新事件:</span>
              {newIncidents.map((incident) => (
                <Tag
                  key={incident.id}
                  className="incident-tag"
                  color={
                    incident.level === "severe"
                      ? "red"
                      : incident.level === "major"
                        ? "orange"
                        : "blue"
                  }
                  closable
                  onClose={() => {
                    setNewIncidents((prev) =>
                      prev.filter((i) => i.id !== incident.id),
                    );
                  }}
                >
                  {incident.title}
                </Tag>
              ))}
            </Space>
          </Col>
        </Row>
      )}

      {/* 地图容器 */}
      <div className="map-container-wrapper">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as "map" | "incidents");
            // 切换到地图 Tab 时更新地图尺寸
            if (key === "map") {
              setTimeout(() => {
                mapService.updateSize();
              }, 100);
            }
          }}
          style={{ height: "100%" }}
          tabBarStyle={{ padding: "0 16px", margin: 0 }}
          items={[
            {
              key: "map",
              label: (
                <span>
                  <EnvironmentOutlined />
                  地图视图
                </span>
              ),
              children: (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      zIndex: 1000,
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <Button
                      type={useClusterMode ? "primary" : "default"}
                      icon={<AppstoreOutlined />}
                      onClick={() => setUseClusterMode(!useClusterMode)}
                    >
                      {useClusterMode ? "聚合模式" : "列表模式"}
                    </Button>
                    <Button
                      type={showResourceList ? "primary" : "default"}
                      icon={<UnorderedListOutlined />}
                      onClick={() => setShowResourceList(true)}
                    >
                      资源列表
                    </Button>
                  </div>
                  {/* 地图组件 - 直接渲染，与事件地图页面保持一致 */}
                  <MapContainer
                    key={`dashboard-map-${mapDisplayData.length}`}
                    resources={mapDisplayData}
                    useCluster={useClusterMode}
                    onResourceClick={handleResourceClick}
                  />
                  {/* 加载状态覆盖层 */}
                  {loading && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 16,
                        background: "rgba(255, 255, 255, 0.8)",
                        zIndex: 100,
                      }}
                    >
                      <Spin size="large" />
                      <div style={{ color: "#888" }}>加载中...</div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "incidents",
              label: (
                <span>
                  <WarningOutlined />
                  应急事件监控
                </span>
              ),
              children: (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "16px",
                    overflow: "auto",
                  }}
                >
                  <Table
                    dataSource={incidents}
                    rowKey="id"
                    pagination={{
                      total: incidentStats.total,
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                    }}
                    columns={[
                      {
                        title: "事件类型",
                        dataIndex: "type",
                        key: "type",
                        render: (type: string) => {
                          const icon =
                            type === "fire" ? (
                              <FireOutlined style={{ color: "#ff4d4f" }} />
                            ) : type === "medical" ? (
                              <MedicineBoxOutlined
                                style={{ color: "#52c41a" }}
                              />
                            ) : (
                              <SafetyOutlined style={{ color: "#1890ff" }} />
                            );
                          return (
                            <Space>
                              {icon}
                              <span>
                                {type === "fire"
                                  ? "火灾"
                                  : type === "medical"
                                    ? "医疗"
                                    : "治安"}
                              </span>
                            </Space>
                          );
                        },
                      },
                      {
                        title: "事件标题",
                        dataIndex: "title",
                        key: "title",
                      },
                      {
                        title: "等级",
                        dataIndex: "level",
                        key: "level",
                        render: (level: string) => {
                          const color =
                            level === "severe"
                              ? "#ff4d4f"
                              : level === "major"
                                ? "#faad14"
                                : "#52c41a";
                          const text =
                            level === "severe"
                              ? "严重"
                              : level === "major"
                                ? "重大"
                                : "一般";
                          return <Tag color={color}>{text}</Tag>;
                        },
                      },
                      {
                        title: "状态",
                        dataIndex: "status",
                        key: "status",
                        render: (status: string) => {
                          const icon =
                            status === "pending" ? (
                              <ClockCircleOutlined />
                            ) : status === "processing" ? (
                              <WarningOutlined />
                            ) : (
                              <CheckCircleOutlined />
                            );
                          const color =
                            status === "pending"
                              ? "orange"
                              : status === "processing"
                                ? "blue"
                                : "green";
                          const text =
                            status === "pending"
                              ? "待处理"
                              : status === "processing"
                                ? "处理中"
                                : "已关闭";
                          return (
                            <Tag icon={icon} color={color}>
                              {text}
                            </Tag>
                          );
                        },
                      },
                      {
                        title: "位置",
                        key: "location",
                        render: (_, record) =>
                          `${Number(record.latitude)?.toFixed(4)}, ${Number(record.longitude)?.toFixed(4)}`,
                      },
                      {
                        title: "上报时间",
                        dataIndex: "reportedAt",
                        key: "reportedAt",
                        render: (time: string) =>
                          new Date(time).toLocaleString("zh-CN"),
                      },
                      {
                        title: "上报人",
                        dataIndex: "reporterName",
                        key: "reporterName",
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8 }} />
            资源详情
          </span>
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
        {selectedResource && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="资源名称">
              {selectedResource.resourceName}
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {selectedResource.typeName}
            </Descriptions.Item>
            <Descriptions.Item label="所属部门">
              {selectedResource.departmentName}
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <span
                style={{
                  color:
                    selectedResource.resourceStatus === "online"
                      ? "#52c41a"
                      : selectedResource.resourceStatus === "alarm"
                        ? "#ff4d4f"
                        : selectedResource.resourceStatus === "processing"
                          ? "#1890ff"
                          : "#d9d9d9",
                }}
              >
                {selectedResource.resourceStatus === "online"
                  ? "在线"
                  : selectedResource.resourceStatus === "alarm"
                    ? "告警"
                    : selectedResource.resourceStatus === "processing"
                      ? "处理中"
                      : "离线"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="当前位置">
              {Number(selectedResource.longitude)?.toFixed(6)},{" "}
              {Number(selectedResource.latitude)?.toFixed(6)}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {selectedResource.contactPerson || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {selectedResource.contactPhone || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="最后更新">
              {selectedResource.updatedAt
                ? new Date(selectedResource.updatedAt).toLocaleString("zh-CN")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 资源列表抽屉 */}
      <Drawer
        title={
          <Space>
            <UnorderedListOutlined />
            资源列表
          </Space>
        }
        onClose={() => setShowResourceList(false)}
        open={showResourceList}
        width={480}
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              style={{ width: 120 }}
              allowClear
              onChange={(value) =>
                setResourceFilter({ ...resourceFilter, status: value })
              }
            >
              <Select.Option value="online">在线</Select.Option>
              <Select.Option value="offline">离线</Select.Option>
              <Select.Option value="alarm">告警</Select.Option>
              <Select.Option value="processing">处理中</Select.Option>
            </Select>
            <Select
              placeholder="类型筛选"
              style={{ width: 120 }}
              allowClear
              onChange={(value) =>
                setResourceFilter({ ...resourceFilter, type: value })
              }
            >
              <Select.Option value="ambulance">救护车</Select.Option>
              <Select.Option value="fire_truck">消防车</Select.Option>
              <Select.Option value="police_car">警车</Select.Option>
              <Select.Option value="sensor">传感器</Select.Option>
              <Select.Option value="person">人员</Select.Option>
            </Select>
          </Space>
        }
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "calc(100vh - 140px)",
            overflow: "auto",
          }}
        >
          {filteredResources.map((resource) => (
            <Card
              key={resource.id}
              size="small"
              hoverable
              onClick={() => {
                handleResourceClick(resource);
                setShowResourceList(false);
              }}
              style={{
                cursor: "pointer",
                borderLeft:
                  resource.resourceStatus === "alarm"
                    ? "3px solid #ff4d4f"
                    : resource.resourceStatus === "processing"
                      ? "3px solid #1890ff"
                      : resource.resourceStatus === "online"
                        ? "3px solid #52c41a"
                        : "3px solid #d9d9d9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Space>
                  <span style={{ fontWeight: 500 }}>
                    {resource.resourceName}
                  </span>
                  <Tag
                    color={
                      resource.resourceStatus === "online"
                        ? "green"
                        : resource.resourceStatus === "alarm"
                          ? "red"
                          : resource.resourceStatus === "processing"
                            ? "blue"
                            : "default"
                    }
                  >
                    {resource.resourceStatus === "online"
                      ? "在线"
                      : resource.resourceStatus === "alarm"
                        ? "告警"
                        : resource.resourceStatus === "processing"
                          ? "处理中"
                          : "离线"}
                  </Tag>
                </Space>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {resource.typeName}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                <div>所属部门: {resource.departmentName}</div>
                {resource.contactPerson && (
                  <div>联系人: {resource.contactPerson}</div>
                )}
                {resource.contactPhone && (
                  <div>电话: {resource.contactPhone}</div>
                )}
                <div>
                  位置: {Number(resource.longitude)?.toFixed(6)},{" "}
                  {Number(resource.latitude)?.toFixed(6)}
                </div>
              </div>
            </Card>
          ))}
          {filteredResources.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#999",
              }}
            >
              暂无符合条件的资源
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default Dashboard;
