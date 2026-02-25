/**
 * ============================================
 * 战术标绘管理页面
 * ============================================
 *
 * 功能说明：
 * - 标绘列表查询
 * - 创建标绘
 * - 编辑标绘
 * - 删除标绘
 * - 按事件查询标绘
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
} from 'antd';
import { http } from '@utils/http';
import DataTable, { type SearchField } from '@/components/DataTable/DataTable';
import type { ColumnsType } from 'antd/es/table';

interface Plotting {
  id: string;
  incident_id?: string;
  incident_title?: string;
  type: string;
  title?: string;
  description?: string;
  geometry: any;
  style?: any;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

interface PlottingFormData {
  incidentId?: string;
  type: string;
  title?: string;
  description?: string;
  geometry?: any;
  style?: any;
}

const PLOTTING_TYPES = [
  { label: '点', value: 'point' },
  { label: '线', value: 'line' },
  { label: '面', value: 'polygon' },
  { label: '圆', value: 'circle' },
  { label: '矩形', value: 'rectangle' },
  { label: '箭头', value: 'arrow' },
  { label: '文本', value: 'text' },
];

const TYPE_COLORS: Record<string, string> = {
  point: 'blue',
  line: 'green',
  polygon: 'orange',
  circle: 'purple',
  rectangle: 'cyan',
  arrow: 'red',
  text: 'default',
};

/**
 * 战术标绘管理页面组件
 */
const PlottingManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [plottings, setPlottings] = useState<Plotting[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentRecord, setCurrentRecord] = useState<Plotting | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const searchParams = useRef<Record<string, any>>({});

  /**
   * 搜索字段配置
   */
  const searchFields: SearchField[] = [
    {
      name: 'incidentId',
      label: '事件ID',
      type: 'input',
      placeholder: '请输入事件ID',
    },
    {
      name: 'type',
      label: '标绘类型',
      type: 'select',
      options: PLOTTING_TYPES,
    },
  ];

  /**
   * 表格列配置
   */
  const columns: ColumnsType<Plotting> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={TYPE_COLORS[type] || 'default'}>
          {PLOTTING_TYPES.find(t => t.value === type)?.label || type}
        </Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '事件',
      dataIndex: 'incident_title',
      key: 'incident_title',
      width: 150,
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
      width: 120,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
  ];

  /**
   * 获取标绘列表
   */
  const fetchPlottings = async () => {
    setLoading(true);
    try {
      const res = await http.get('/api/v1/plotting', {
        params: { page, pageSize, ...searchParams.current },
      });
      if (res?.data) {
        setPlottings(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      message.error('获取标绘列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlottings();
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
  const handleEdit = (record: Plotting) => {
    setModalMode('edit');
    setCurrentRecord(record);
    form.setFieldsValue({
      incidentId: record.incident_id,
      type: record.type,
      title: record.title,
      description: record.description,
      geometry: record.geometry,
      style: record.style,
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
        await http.post('/api/v1/plotting', values);
        message.success('创建成功');
      } else {
        await http.put(`/api/v1/plotting/${currentRecord?.id}`, values);
        message.success('更新成功');
      }

      setModalVisible(false);
      fetchPlottings();
    } catch (error) {
      message.error(modalMode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async (record: Plotting) => {
    try {
      await http.delete(`/api/v1/plotting/${record.id}`);
      message.success('删除成功');
      fetchPlottings();
    } catch (error) {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <DataTable<Plotting>
        columns={columns}
        dataSource={plottings}
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
        onRefresh={fetchPlottings}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑Modal */}
      <Modal
        title={modalMode === 'create' ? '创建标绘' : '编辑标绘'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="事件ID" name="incidentId">
            <Input placeholder="请输入事件ID（可选）" />
          </Form.Item>

          <Form.Item
            label="标绘类型"
            name="type"
            rules={[{ required: true, message: '请选择标绘类型' }]}
          >
            <Select options={PLOTTING_TYPES} placeholder="请选择标绘类型" />
          </Form.Item>

          <Form.Item label="标题" name="title">
            <Input placeholder="请输入标题" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item
            label="几何数据（JSON）"
            name="geometry"
            rules={[{ required: true, message: '请输入几何数据' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder='请输入GeoJSON格式的几何数据，例如：{"type":"Point","coordinates":[116.404,39.915]}'
            />
          </Form.Item>

          <Form.Item label="样式（JSON）" name="style">
            <Input.TextArea
              rows={4}
              placeholder='请输入样式配置（JSON格式），例如：{"color":"#ff0000","opacity":0.5}'
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PlottingManagement;
