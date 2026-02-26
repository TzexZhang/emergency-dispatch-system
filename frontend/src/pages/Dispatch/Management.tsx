/**
 * ============================================
 * 调度任务管理页面
 * ============================================
 *
 * 功能说明：
 * - 任务列表查询
 * - 创建调度任务
 * - 更新任务
 * - 更新任务状态
 * - 取消任务
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
} from "antd";
import { http } from "@utils/http";
import DataTable, { type SearchField } from "@/components/DataTable/DataTable";
import type { ColumnsType } from "antd/es/table";
import type { DispatchTaskListItem } from "@/types";

interface TaskFormData {
  incidentId?: string;
  taskType: string;
  title: string;
  description?: string;
  priority: string;
  resourceId?: string;
  assignedTo?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

const TASK_TYPES = [
  { label: "紧急调度", value: "emergency" },
  { label: "日常调度", value: "routine" },
  { label: "支援调度", value: "support" },
];

const PRIORITIES: { label: string; value: DispatchTaskListItem["priority"] }[] =
  [
    { label: "低", value: "low" },
    { label: "中", value: "medium" },
    { label: "高", value: "high" },
    { label: "紧急", value: "urgent" },
  ];

const STATUSES: { label: string; value: DispatchTaskListItem["status"] }[] = [
  { label: "待分配", value: "pending" },
  { label: "已分配", value: "assigned" },
  { label: "执行中", value: "in_progress" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
];

const STATUS_COLORS: Record<DispatchTaskListItem["status"], string> = {
  pending: "default",
  assigned: "blue",
  in_progress: "processing",
  completed: "success",
  cancelled: "error",
};

const PRIORITY_COLORS: Record<DispatchTaskListItem["priority"], string> = {
  low: "default",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

/**
 * 调度任务管理页面组件
 */
const DispatchManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<DispatchTaskListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resources, setResources] = useState<any[]>([]);

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentRecord, setCurrentRecord] =
    useState<DispatchTaskListItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const searchParams = useRef<Record<string, any>>({});

  /**
   * 搜索字段配置
   */
  const searchFields: SearchField[] = [
    {
      name: "status",
      label: "状态",
      type: "select",
      options: STATUSES,
    },
    {
      name: "priority",
      label: "优先级",
      type: "select",
      options: PRIORITIES,
    },
  ];

  /**
   * 表格列配置
   */
  const columns: ColumnsType<DispatchTaskListItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      ellipsis: true,
    },
    {
      title: "任务标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "类型",
      dataIndex: "taskType",
      key: "taskType",
      width: 100,
      render: (type) => {
        const item = TASK_TYPES.find((t) => t.value === type);
        return item?.label || type;
      },
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 80,
      render: (priority) => (
        <Tag color={PRIORITY_COLORS[priority] || "default"}>
          {PRIORITIES.find((p) => p.value === priority)?.label || priority}
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
          {STATUSES.find((s) => s.value === status)?.label || status}
        </Tag>
      ),
    },
    {
      title: "资源",
      dataIndex: "resourceName",
      key: "resourceName",
      width: 120,
    },
    {
      title: "负责人",
      dataIndex: "assigneeName",
      key: "assigneeName",
      width: 120,
    },
    {
      title: "创建人",
      dataIndex: "creatorName",
      key: "creatorName",
      width: 120,
    },
    {
      title: "计划开始时间",
      dataIndex: "scheduledStart",
      key: "scheduledStart",
      width: 180,
    },
  ];

  /**
   * 获取任务列表
   */
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await http.get("/api/v1/dispatch/tasks", {
        params: { page, pageSize, ...searchParams.current },
      });
      if (res?.data) {
        setTasks(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      message.error("获取任务列表失败");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取资源列表
   */
  const fetchResources = async () => {
    try {
      const res = await http.get("/api/v1/resources", {
        params: { page: 1, pageSize: 1000 },
      });
      if (res?.data?.list) {
        setResources(
          res.data.list.map((r: any) => ({
            label: r.resourceName || r.name,
            value: r.id,
          })),
        );
      }
    } catch (error) {
      console.error("获取资源列表失败", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchResources();
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
  const handleEdit = (record: DispatchTaskListItem) => {
    setModalMode("edit");
    setCurrentRecord(record);
    form.setFieldsValue({
      incidentId: record.incidentId,
      taskType: record.taskType,
      title: record.title,
      description: record.description,
      priority: record.priority,
      resourceId: record.resourceId,
      assignedTo: record.assignedTo,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
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
        await http.post("/api/v1/dispatch/tasks", {
          ...values,
          scheduledStart: values.scheduledStart
            ? values.scheduledStart.format()
            : undefined,
          scheduledEnd: values.scheduledEnd
            ? values.scheduledEnd.format()
            : undefined,
        });
        message.success("创建成功");
      } else {
        await http.put(`/api/v1/dispatch/tasks/${currentRecord?.id}`, {
          ...values,
          scheduledStart: values.scheduledStart
            ? values.scheduledStart.format()
            : undefined,
          scheduledEnd: values.scheduledEnd
            ? values.scheduledEnd.format()
            : undefined,
        });
        message.success("更新成功");
      }

      setModalVisible(false);
      fetchTasks();
    } catch (error) {
      message.error(modalMode === "create" ? "创建失败" : "更新失败");
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = async (record: DispatchTaskListItem) => {
    try {
      await http.delete(`/api/v1/dispatch/tasks/${record.id}`);
      message.success("删除成功");
      fetchTasks();
    } catch (error) {
      message.error("删除失败");
    }
  };

  return (
    <div>
      <DataTable<DispatchTaskListItem>
        columns={columns}
        dataSource={tasks}
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
        onRefresh={fetchTasks}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑Modal */}
      <Modal
        title={modalMode === "create" ? "创建任务" : "编辑任务"}
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
            label="任务类型"
            name="taskType"
            rules={[{ required: true, message: "请选择任务类型" }]}
          >
            <Select options={TASK_TYPES} placeholder="请选择任务类型" />
          </Form.Item>

          <Form.Item
            label="任务标题"
            name="title"
            rules={[{ required: true, message: "请输入任务标题" }]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item label="任务描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>

          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: "请选择优先级" }]}
          >
            <Select options={PRIORITIES} placeholder="请选择优先级" />
          </Form.Item>

          <Form.Item label="分配资源" name="resourceId">
            <Select
              options={resources}
              placeholder="请选择资源"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="负责人" name="assignedTo">
            <Input placeholder="请输入负责人ID" />
          </Form.Item>

          <Space size="middle" style={{ width: "100%" }}>
            <Form.Item label="计划开始时间" name="scheduledStart">
              <DatePicker showTime style={{ width: 220 }} />
            </Form.Item>

            <Form.Item label="计划结束时间" name="scheduledEnd">
              <DatePicker showTime style={{ width: 220 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default DispatchManagement;
