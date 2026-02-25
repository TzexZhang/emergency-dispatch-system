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

import { useState, useEffect } from 'react';
import { Row, Col, Statistic, Spin } from 'antd';
import {
  EnvironmentOutlined,
  AlertOutlined,
  CarOutlined,
} from '@ant-design/icons';
import MapContainer from '@components/Map/MapContainer';
import { http } from '@utils/http';
import { wsService } from '@services/websocket.service';
import type { Resource, ResourceUpdate } from '@/types';

/**
 * 指挥大屏组件
 */
const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    alarm: 0,
  });
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    fetchStats();
    fetchResources();

    // WebSocket连接
    const token = localStorage.getItem('token');
    if (token) {
      wsService.connect(token);
      wsService.on<ResourceUpdate>('resource:update', handleResourceUpdate);
    }

    return () => {
      wsService.disconnect();
    };
  }, []);

  /**
   * 获取统计数据
   */
  const fetchStats = async () => {
    try {
      const res = await http.get<{
        total: number;
        online: number;
        offline: number;
        alarm: number;
      }>('/api/v1/resources/stats');
      if (res?.data) {
        setStats(res.data);
      }
    } catch (error) {
      // 设置默认值，防止渲染错误
      setStats({
        total: 0,
        online: 0,
        offline: 0,
        alarm: 0,
      });
    }
  };

  /**
   * 获取资源列表
   */
  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await http.get<{
        list: Resource[];
        total?: number;
      }>('/api/v1/resources', {
        params: { page: 1, pageSize: 100 },
      });
      if (res?.data && typeof res.data === 'object' && 'list' in res.data) {
        setResources(res.data.list as Resource[]);
      } else {
        setResources([]);
      }
    } catch (error) {
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理资源更新
   */
  const handleResourceUpdate = (data: ResourceUpdate) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === data.id
          ? {
              ...r,
              resourceStatus: data.status as Resource['resourceStatus'],
              longitude: data.lng,
              latitude: data.lat,
            }
          : r
      )
    );
    fetchStats();
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Spin size="large" />
        <div style={{ color: '#888' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 统计面板 */}
      <Row
        gutter={16}
        style={{
          padding: '16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <Col span={6}>
          <Statistic
            title="总资源数"
            value={stats.total}
            prefix={<EnvironmentOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="在线"
            value={stats.online}
            prefix={<CarOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="离线"
            value={stats.offline}
            valueStyle={{ color: '#d9d9d9' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="告警"
            value={stats.alarm}
            prefix={<AlertOutlined />}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>
      </Row>

      {/* 地图容器 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapContainer resources={resources} />
      </div>
    </div>
  );
};

export default Dashboard;
