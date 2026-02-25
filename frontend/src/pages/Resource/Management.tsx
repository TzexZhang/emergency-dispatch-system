/**
 * ============================================
 * 资源管理页面
 * ============================================
 *
 * 功能说明：
 * - 资源列表查询（分页、筛选）
 * - 创建资源
 * - 编辑资源
 * - 删除资源
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  InputNumber,
} from 'antd';
import { http } from '@utils/http';
import DataTable, { type SearchField } from '@/components/DataTable/DataTable';
import type { ColumnsType } from 'antd/es/table';

interface Resource {
  id: string;
  resourceTypeId: string;
  resourceName: string;
  resourceCode?: string;
  resourceStatus: 'online' | 'offline' | 'alarm' | 'processing';
  longitude: number;
  latitude: number;
  altitude?: number;
  speed?: number;
  direction?: number;
  departmentId?: string;
  typeName?: string;
}

interface ResourceFormData {
  resourceTypeId: string;
  resourceName: string;
  resourceCode?: string;
  resourceStatus: string;
  longitude: number;
  latitude: number;
  altitude?: number;
  departmentId?: string;
}

const STATUS_OPTIONS = [
  { label: '在线', value: 'online' },
  { label: '离线', value: 'offline' },
  { label: '告警', value: 'alarm' },
  { label: '处理中', value: 'processing' },
];

const STATUS_COLORS: Record<string, string> = {
  online: 'success',
  offline: 'default',
  alarm: 'error',
  processing: 'processing',
};

/**
 * 资源管理页面组件
 */
const ResourceManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resourceTypes, setResourceTypes] = useState<any[]>([]);

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentRecord, setCurrentRecord] = useState<Resource | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const searchParams = useRef<Record<string, any>>({});

  /**
   * 搜索字段配置
   */
  const searchFields: SearchField[] = [
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    {
      name: 'keyword',
      label: '关键词',
      type: 'input',
      placeholder: '搜索资源名称或编码',
    },
  ];

  /**
   * 表格列配置
   */
  const columns: ColumnsType<Resource> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '资源名称',
      dataIndex: 'resourceName',
      key: 'resourceName',
    },
    {
      title: '资源编码',
      dataIndex: 'resourceCode',
      key: 'resourceCode',
      width: 150,
    },
    {
      title: '类型',
      dataIndex: 'typeName',
      key: 'typeName',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'resourceStatus',
      key: 'resourceStatus',
      width: 100,
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {STATUS_OPTIONS.find(s => s.value === status)?.label || status}
        </Tag>
      ),
    },
    {
      title: '经度',
      dataIndex: 'longitude',
      key: 'longitude',
      width: 120,
    },
    {
      title: '纬度',
      dataIndex: 'latitude',
      key: 'latitude',
      width: 120,
    },
    {
      title: '速度',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed) => (speed ? `${speed.toFixed(2)} km/h` : '-'),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (direction) => (direction ? `${direction.toFixed(0)}°` : '-'),
    },
  ];

  /**
   * 获取资源列表
   */
  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await http.get('/api/v1/resources', {
        params: { page, pageSize, ...searchParams.current },
      });
      if (res?.data) {
        setResources(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      message.error('获取资源列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取资源类型列表
   */
  const fetchResourceTypes = async () => {
    try {
      const res = await http.get('/api/v1/resources/types');
      if (res?.data) {
        setResourceTypes(
          res.data.map((t: any) => ({
            label: t.typeName,
            value: t.id,
          }))
        );
      }
    } catch (error) {
      console.error('获取资源类型失败', error);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchResourceTypes();
  }, [page, pageSize]);

  /**
   * 打开新增Modal
   */
  const handleAdd = () => {
    setModalMode('create');
    setCurrentRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  /**
   * 打开编辑Modal
   */
  const handleEdit = (record: Resource) => {
    setModalMode('edit');
    setCurrentRecord(record);
    form.setFieldsValue({
      resourceTypeId: record.resourceTypeId,
      resourceName: record.resourceName,
      resourceCode: record.resourceCode,
      resourceStatus: record.resourceStatus,
      longitude: record.longitude,
      latitude: record.latitude,
      altitude: record.altitude,
      departmentId: record.departmentId,
    });
    setModalVisible(true);
  };

  /**
   * 处理Modal提交
   */
  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setModalLoading(true);

      if (modalMode === 'create') {
        await http.post('/api/v1/resources', values);
        message.success('创建成功');
      } else {
        await http.put(`/api/v1/resources/${currentRecord?.id}`, values);
        message.success('更新成功');
      }

      setModalVisible(false);
      fetchResources();
    } catch (error) {
      message.error(modalMode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async (record: Resource) => {
    try {
      await http.delete(`/api/v1/resources/${record.id}`);
      message.success('删除成功');
      fetchResources();
    } catch (error) {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <DataTable<Resource>
        columns={columns}
        dataSource={resources}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize || 10);
          },
        }}
        searchFields={searchFields}
        onAdd={handleAdd}
        onRefresh={fetchResources}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑Modal */}
      <Modal
        title={modalMode === 'create' ? '创建资源' : '编辑资源'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="资源类型"
            name="resourceTypeId"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select
              options={resourceTypes}
              placeholder="请选择资源类型"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="资源名称"
            name="resourceName"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="请输入资源名称" />
          </Form.Item>

          <Form.Item label="资源编码" name="resourceCode">
            <Input placeholder="请输入资源编码" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="resourceStatus"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select options={STATUS_OPTIONS} placeholder="请选择状态" />
          </Form.Item>

          <Space size="middle" style={{ width: '100%' }}>
            <Form.Item
              label="经度"
              name="longitude"
              rules={[{ required: true, message: '请输入经度' }]}
            >
              <InputNumber
                style={{ width: 200 }}
                placeholder="请输入经度"
                precision={6}
              />
            </Form.Item>

            <Form.Item
              label="纬度"
              name="latitude"
              rules={[{ required: true, message: '请输入纬度' }]}
            >
              <InputNumber
                style={{ width: 200 }}
                placeholder="请输入纬度"
                precision={6}
              />
            </Form.Item>
          </Space>

          <Form.Item label="海拔" name="altitude">
            <InputNumber
              style={{ width: 200 }}
              placeholder="请输入海拔（米）"
              precision={2}
            />
          </Form.Item>

          <Form.Item label="部门ID" name="departmentId">
            <Input placeholder="请输入部门ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceManagement;
