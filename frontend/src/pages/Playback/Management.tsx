/**
 * ============================================
 * 轨迹回放管理页面
 * ============================================
 *
 * 功能说明：
 * - 轨迹查询（资源ID、时间范围）
 * - 轨迹数据展示
 * - 导出功能（JSON/GeoJSON/CSV）
 * - 轨迹统计
 *
 * @author Emergency Dispatch Team
 */

import { useState } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  message,
  Space,
  Statistic,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { http } from '@utils/http';
import dayjs from 'dayjs';

interface TrajectoryPoint {
  id: string;
  resource_id: string;
  resource_name?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  direction?: number;
  location?: string;
  recorded_at: string;
}

interface TrajectoryStats {
  pointCount: number;
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  speed: {
    avg: number;
    max: number;
  };
  totalDistance: number;
  duration: {
    start: string;
    end: string;
  };
}

const EXPORT_FORMATS = [
  { label: 'JSON', value: 'json' },
  { label: 'GeoJSON', value: 'geojson' },
  { label: 'CSV', value: 'csv' },
];

/**
 * 轨迹回放管理页面组件
 */
const PlaybackManagement: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
  const [stats, setStats] = useState<TrajectoryStats | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  /**
   * 表格列配置
   */
  const columns: ColumnsType<TrajectoryPoint> = [
    {
      title: '时间',
      dataIndex: 'recorded_at',
      key: 'recorded_at',
      width: 180,
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
      width: 120,
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
      width: 120,
    },
    {
      title: '速度(km/h)',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed) => (speed ? speed.toFixed(2) : '-'),
    },
    {
      title: '方向(°)',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (direction) => (direction ? direction.toFixed(0) : '-'),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      ellipsis: true,
    },
  ];

  /**
   * 获取资源列表
   */
  const fetchResources = async () => {
    try {
      const res = await http.get('/api/v1/resources', {
        params: { page: 1, pageSize: 1000 },
      });
      if (res?.data?.list) {
        setResources(
          res.data.list.map((r: any) => ({
            label: `${r.resourceName || r.name} (${r.resourceCode || r.id})`,
            value: r.id,
          }))
        );
      }
    } catch (error) {
      console.error('获取资源列表失败', error);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  /**
   * 处理查询
   */
  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setHasSearched(true);

      const startTime = values.timeRange[0].format('YYYY-MM-DD HH:mm:ss');
      const endTime = values.timeRange[1].format('YYYY-MM-DD HH:mm:ss');

      // 查询轨迹数据
      const res = await http.get('/api/v1/playback/trajectory', {
        params: {
          resourceId: values.resourceId,
          startTime,
          endTime,
        },
      });

      if (res?.data) {
        setTrajectories(res.data.points || []);
      }

      // 查询统计信息
      const statsRes = await http.get('/api/v1/playback/stats', {
        params: {
          resourceId: values.resourceId,
          startTime,
          endTime,
        },
      });

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      message.error('查询轨迹失败');
      setTrajectories([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理导出
   */
  const handleExport = async (format: string) => {
    try {
      const values = await form.validateFields();
      setExporting(true);

      const startTime = values.timeRange[0].format('YYYY-MM-DD HH:mm:ss');
      const endTime = values.timeRange[1].format('YYYY-MM-DD HH:mm:ss');

      const url = `${import.meta.env.VITE_API_URL}/api/v1/playback/export`;
      const params = new URLSearchParams({
        resourceId: values.resourceId,
        startTime,
        endTime,
        format,
      });

      // 直接下载文件
      const link = document.createElement('a');
      link.href = `${url}?${params.toString()}`;
      link.download = `trajectory-${values.resourceId}-${Date.now()}.${format === 'geojson' ? 'geojson' : format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="轨迹查询" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item
            name="resourceId"
            label="资源"
            rules={[{ required: true, message: '请选择资源' }]}
          >
            <Select
              placeholder="请选择资源"
              style={{ width: 250 }}
              options={resources}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="时间范围"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <DatePicker.RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: 380 }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  form.resetFields();
                  setTrajectories([]);
                  setStats(null);
                  setHasSearched(false);
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {hasSearched && stats && (
        <Card title="轨迹统计" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="轨迹点数" value={stats.pointCount} suffix="个" />
            </Col>
            <Col span={6}>
              <Statistic
                title="总距离"
                value={stats.totalDistance}
                suffix="km"
                precision={3}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均速度"
                value={stats.speed.avg}
                suffix="km/h"
                precision={2}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最高速度"
                value={stats.speed.max}
                suffix="km/h"
                precision={2}
              />
            </Col>
          </Row>
        </Card>
      )}

      {hasSearched && (
        <Card
          title="轨迹数据"
          extra={
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('json')}
                loading={exporting}
              >
                导出JSON
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('geojson')}
                loading={exporting}
              >
                导出GeoJSON
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('csv')}
                loading={exporting}
              >
                导出CSV
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={trajectories}
            loading={loading}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20,
            }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
    </div>
  );
};

export default PlaybackManagement;
