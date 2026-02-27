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

import { useState, useEffect, useCallback, useRef } from "react";
import { Row, Col, Statistic, Spin, Button, Modal, Descriptions } from "antd";
import {
  EnvironmentOutlined,
  AlertOutlined,
  CarOutlined,
  AppstoreOutlined,
  BorderOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import MapContainer from "@components/Map/MapContainer";
import { http } from "@utils/http";
import { wsService } from "@services/websocket.service";
import type { Resource, ResourceUpdate } from "@/types";

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    alarm: 0,
  });
  const [resources, setResources] = useState<Resource[]>([]);
  const [useCluster, setUseCluster] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
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

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<{
        list: Resource[];
        total?: number;
      }>("/api/v1/resources", {
        params: { page: 1, pageSize: 100 },
      });
      if (res?.data && typeof res.data === "object" && "list" in res.data) {
        setResources(res.data.list as Resource[]);
      } else {
        setResources([]);
      }
    } catch {
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

  const handleResourceClick = useCallback((resource: Resource) => {
    setSelectedResource(resource);
    setModalVisible(true);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchResources();

    const token = localStorage.getItem("token");
    if (token) {
      wsService.connect(token);
      wsConnectedRef.current = true;
      wsService.on<ResourceUpdate>("resource:update", handleResourceUpdate);
    }

    return () => {
      if (wsConnectedRef.current) {
        wsService.off("resource:update", handleResourceUpdate);
        wsService.disconnect();
        wsConnectedRef.current = false;
      }
    };
  }, [fetchStats, fetchResources, handleResourceUpdate]);

  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Spin size="large" />
        <div style={{ color: "#888" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 统计面板 */}
      <Row
        gutter={16}
        style={{
          padding: "16px",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
        }}
      >
        <Col span={6}>
          <Statistic
            title="总资源数"
            value={stats.total}
            prefix={<EnvironmentOutlined />}
            valueStyle={{ color: "#3f8600" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="在线"
            value={stats.online}
            prefix={<CarOutlined />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="离线"
            value={stats.offline}
            valueStyle={{ color: "#d9d9d9" }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="告警"
            value={stats.alarm}
            prefix={<AlertOutlined />}
            valueStyle={{ color: "#ff4d4f" }}
          />
        </Col>
      </Row>

      {/* 地图容器 */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 1000,
          }}
        >
          <Button
            type={useCluster ? "primary" : "default"}
            icon={useCluster ? <AppstoreOutlined /> : <BorderOutlined />}
            onClick={() => setUseCluster(!useCluster)}
          >
            {useCluster ? "聚合模式" : "列表模式"}
          </Button>
        </div>
        <MapContainer
          resources={resources}
          useCluster={useCluster}
          onResourceClick={handleResourceClick}
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
              {selectedResource.longitude?.toFixed(6)},{" "}
              {selectedResource.latitude?.toFixed(6)}
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
    </div>
  );
};

export default Dashboard;
