/**
 * ============================================
 * 通用数据表格组件
 * ============================================
 *
 * 功能特性：
 * - 搜索栏（支持Input和Select筛选）
 * - 工具栏（新增按钮）
 * - 表格（分页、排序）
 * - 操作列（编辑、删除）
 * - 确认删除对话框
 *
 * @author Emergency Dispatch Team
 */

import { useState } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Modal,
  message,
  type TableProps,
  type FormProps,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface DataTableProps<T = any> extends Omit<TableProps<T>, 'columns'> {
  // 表格列配置
  columns: ColumnsType<T>;

  // 搜索配置
  searchable?: boolean;
  searchFields?: SearchField[];

  // 工具栏配置
  showToolbar?: boolean;
  toolbarExtra?: React.ReactNode;

  // 操作配置
  showActions?: boolean;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => Promise<void> | void;

  // 新增按钮
  showAddButton?: boolean;
  onAdd?: () => void;
  addButtonText?: string;

  // 刷新按钮
  showRefreshButton?: boolean;
  onRefresh?: () => Promise<void> | void;

  // 行选择
  selectable?: boolean;
  rowSelection?: TableProps<T>['rowSelection'];

  // 自定义表格内容
  extra?: React.ReactNode;
}

export interface SearchField {
  name: string;
  label: string;
  type: 'input' | 'select';
  placeholder?: string;
  options?: { label: string; value: string | number }[];
  width?: number;
}

/**
 * 通用数据表格组件
 */
const DataTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  loading,
  pagination,
  searchable = true,
  searchFields = [],
  showToolbar = true,
  toolbarExtra,
  showActions = true,
  onEdit,
  onDelete,
  showAddButton = true,
  onAdd,
  addButtonText = '新增',
  showRefreshButton = true,
  onRefresh,
  selectable = false,
  rowSelection,
  extra,
  ...tableProps
}: DataTableProps<T>) => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  /**
   * 处理搜索
   */
  const handleSearch = () => {
    // 触发外部搜索逻辑
    // 这里应该通过回调传递搜索参数
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * 重置搜索
   */
  const handleReset = () => {
    setSearchValues({});
    if (onRefresh) {
      onRefresh();
    }
  };

  /**
   * 处理删除
   */
  const handleDelete = (record: T) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        if (onDelete) {
          try {
            await onDelete(record);
            message.success('删除成功');
            if (onRefresh) {
              onRefresh();
            }
          } catch (error) {
            message.error('删除失败');
          }
        }
      },
    });
  };

  /**
   * 构建操作列
   */
  const buildActionColumn = (): ColumnsType<T>[number] => ({
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        {onEdit && (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
        )}
        {onDelete && (
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        )}
      </Space>
    ),
  });

  /**
   * 构建最终的表格列
   */
  const finalColumns: ColumnsType<T> = showActions
    ? [...columns, buildActionColumn()]
    : columns;

  /**
   * 渲染搜索栏
   */
  const renderSearchBar = () => {
    if (!searchable || searchFields.length === 0) {
      return null;
    }

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          {searchFields.map((field) => {
            if (field.type === 'input') {
              return (
                <Input
                  key={field.name}
                  placeholder={field.placeholder || field.label}
                  value={searchValues[field.name]}
                  onChange={(e) =>
                    setSearchValues({ ...searchValues, [field.name]: e.target.value })
                  }
                  onPressEnter={handleSearch}
                  style={{ width: field.width || 200 }}
                  allowClear
                />
              );
            } else if (field.type === 'select') {
              return (
                <Select
                  key={field.name}
                  placeholder={field.placeholder || field.label}
                  value={searchValues[field.name]}
                  onChange={(value) =>
                    setSearchValues({ ...searchValues, [field.name]: value })
                  }
                  style={{ width: field.width || 150 }}
                  allowClear
                  options={field.options}
                />
              );
            }
            return null;
          })}
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>
    );
  };

  /**
   * 渲染工具栏
   */
  const renderToolbar = () => {
    if (!showToolbar) {
      return null;
    }

    return (
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          {showAddButton && onAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {addButtonText}
            </Button>
          )}
          {toolbarExtra}
        </Space>
        {showRefreshButton && onRefresh && (
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderSearchBar()}
      {renderToolbar()}
      <Table<T>
        {...tableProps}
        columns={finalColumns}
        dataSource={dataSource}
        loading={loading}
        pagination={
          pagination !== false
            ? {
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: ['10', '20', '50', '100'],
              ...pagination,
            }
            : false
        }
        rowSelection={selectable ? rowSelection : undefined}
        scroll={{ x: 'max-content', ...tableProps.scroll }}
      />
      {extra}
    </div>
  );
};

export default DataTable;
