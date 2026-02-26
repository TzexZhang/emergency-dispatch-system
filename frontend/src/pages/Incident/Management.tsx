/**
 * ============================================
 * 事件管理页面
 * ============================================
 *
 * 功能说明：
 * - 事件列表查询（分页、筛选）
 * - 创建事件
 * - 编辑事件
 * - 删除事件
 * - 关闭事件
 *
 * @author Emergency Dispatch Team
 */

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  DatePicker,
  InputNumber,
} from "antd";
import { http } from "@utils/http";
import DataTable, { type SearchField } from "@/components/DataTable/DataTable";
import type { ColumnsType } from "antd/es/table";
import type {
  IncidentListItem,
  IncidentType,
  IncidentLevel,
  IncidentStatus,
} from "@/types";

interface IncidentFormData {
  type: string;
  title: string;
  description?: string;
  level: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  occurredAt?: string;
}

const INCIDENT_TYPES: { label: string; value: IncidentType }[] = [
  { label: "火灾", value: "fire" },
  { label: "交通事故", value: "traffic" },
  { label: "医疗急救", value: "medical" },
  { label: "公共安全", value: "public_security" },
  { label: "自然灾害", value: "natural_disaster" },
];

const INCIDENT_LEVELS: { label: string; value: IncidentLevel }[] = [
  { label: "一般", value: "minor" },
  { label: "重大", value: "major" },
  { label: "特大", value: "severe" },
];

const INCIDENT_STATUSES: { label: string; value: IncidentStatus }[] = [
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已解决", value: "resolved" },
  { label: "已关闭", value: "closed" },
];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  pending: "orange",
  processing: "blue",
  resolved: "green",
  closed: "default",
};

const LEVEL_COLORS: Record<IncidentLevel, string> = {
  minor: "green",
  major: "orange",
  severe: "red",
};

/**
 * 事件管理页面组件
 */
const IncidentManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentRecord, setCurrentRecord] = useState<IncidentListItem | null>(
    null,
  );
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const searchParams = useRef<Record<string, any>>({});

  /**
   * 搜索字段配置
   */
  const searchFields: SearchField[] = [
    {
      name: "type",
      label: "事件类型",
      type: "select",
      options: INCIDENT_TYPES,
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: INCIDENT_STATUSES,
    },
    {
      name: "level",
      label: "等级",
      type: "select",
      options: INCIDENT_LEVELS,
    },
    {
      name: "keyword",
      label: "关键词",
      type: "input",
      placeholder: "搜索标题或描述",
    },
  ];

  /**
   * 表格列配置
   */
  const columns: ColumnsType<IncidentListItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      ellipsis: true,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type) => {
        const item = INCIDENT_TYPES.find((t) => t.value === type);
        return item?.label || type;
      },
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "等级",
      dataIndex: "level",
      key: "level",
      width: 80,
      render: (level) => (
        <Tag color={LEVEL_COLORS[level] || "default"}>
          {INCIDENT_LEVELS.find((l) => l.value === level)?.label || level}
        </Tag>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status) => (
        <Tag color={STATUS_COLORS[status] || "default"}>
          {INCIDENT_STATUSES.find((s) => s.value === status)?.label || status}
        </Tag>
      ),
    },
    {
      title: "上报人",
      dataIndex: "reporterName",
      key: "reporterName",
      width: 120,
    },
    {
      title: "处理人",
      dataIndex: "assigneeName",
      key: "assigneeName",
      width: 120,
    },
    {
      title: "上报时间",
      dataIndex: "reportedAt",
      key: "reportedAt",
      width: 180,
    },
  ];

  /**
   * 获取事件列表
   */
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await http.get("/api/v1/incidents", {
        params: { page, pageSize, ...searchParams.current },
      });
      if (res?.data) {
        setIncidents(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      message.error("获取事件列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, pageSize]);

  /**
   * 打开新增Modal
   */
  const handleAdd = () => {
    setModalMode("create");
    setCurrentRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  /**
   * 打开编辑Modal
   */
  const handleEdit = (record: IncidentListItem) => {
    setModalMode("edit");
    setCurrentRecord(record);
    form.setFieldsValue({
      type: record.type,
      title: record.title,
      description: record.description,
      level: record.level,
      location: record.location,
      latitude: record.latitude,
      longitude: record.longitude,
      occurredAt: record.occurredAt,
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

      if (modalMode === "create") {
        await http.post("/api/v1/incidents", {
          ...values,
          occurredAt: values.occurredAt
            ? values.occurredAt.format()
            : undefined,
        });
        message.success("创建成功");
      } else {
        await http.put(`/api/v1/incidents/${currentRecord?.id}`, {
          ...values,
          occurredAt: values.occurredAt
            ? values.occurredAt.format()
            : undefined,
        });
        message.success("更新成功");
      }

      setModalVisible(false);
      fetchIncidents();
    } catch (error) {
      message.error(modalMode === "create" ? "创建失败" : "更新失败");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async (record: IncidentListItem) => {
    try {
      await http.delete(`/api/v1/incidents/${record.id}`);
      message.success("删除成功");
      fetchIncidents();
    } catch (error) {
      message.error("删除失败");
    }
  };

  return (
    <div>
      <DataTable<IncidentListItem>
        columns={columns}
        dataSource={incidents}
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
        onRefresh={fetchIncidents}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑Modal */}
      <Modal
        title={modalMode === "create" ? "创建事件" : "编辑事件"}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="事件类型"
            name="type"
            rules={[{ required: true, message: "请选择事件类型" }]}
          >
            <Select options={INCIDENT_TYPES} placeholder="请选择事件类型" />
          </Form.Item>

          <Form.Item
            label="事件标题"
            name="title"
            rules={[{ required: true, message: "请输入事件标题" }]}
          >
            <Input placeholder="请输入事件标题" />
          </Form.Item>

          <Form.Item label="事件描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入事件描述" />
          </Form.Item>

          <Form.Item
            label="事件等级"
            name="level"
            rules={[{ required: true, message: "请选择事件等级" }]}
          >
            <Select options={INCIDENT_LEVELS} placeholder="请选择事件等级" />
          </Form.Item>

          <Form.Item label="发生地点" name="location">
            <Input placeholder="请输入发生地点" />
          </Form.Item>

          <Space size="middle" style={{ width: "100%" }}>
            <Form.Item label="纬度" name="latitude">
              <InputNumber style={{ width: 200 }} placeholder="请输入纬度" />
            </Form.Item>

            <Form.Item label="经度" name="longitude">
              <InputNumber style={{ width: 200 }} placeholder="请输入经度" />
            </Form.Item>
          </Space>

          <Form.Item label="发生时间" name="occurredAt">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IncidentManagement;
