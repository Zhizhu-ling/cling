import { Table, Tag, Button, Empty, Alert, Space, Popconfirm } from 'antd';
import { EditOutlined, ReloadOutlined, RobotOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { Requirement, RequirementStatus, RequirementPriority } from '@/api/requirement';

/**
 * Status display configuration.
 */
const STATUS_MAP: Record<RequirementStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  analyzing: { label: '分析中', color: 'processing' },
  split_done: { label: '已拆解', color: 'cyan' },
  assigned: { label: '已分配', color: 'blue' },
  in_progress: { label: '进行中', color: 'orange' },
  closed: { label: '已关闭', color: 'green' },
};

/**
 * Priority display configuration.
 */
const PRIORITY_MAP: Record<RequirementPriority, { label: string; color: string }> = {
  1: { label: '紧急', color: 'red' },
  2: { label: '高', color: 'orange' },
  3: { label: '中', color: 'blue' },
  4: { label: '低', color: 'default' },
};

interface RequirementTableProps {
  dataSource: Requirement[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (requirement: Requirement) => void;
  onDelete: (requirement: Requirement) => void;
  onRetry: () => void;
}

/**
 * Requirements table with pagination.
 * Displays requirement list with status, priority, and actions.
 */
export default function RequirementTable({
  dataSource,
  loading,
  error,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  onRetry,
}: RequirementTableProps) {
  const navigate = useNavigate();

  const columns: ColumnsType<Requirement> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '30%',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: RequirementStatus) => {
        const config = STATUS_MAP[status] ?? { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: RequirementPriority) => {
        const config = PRIORITY_MAP[priority] ?? { label: String(priority), color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => (date ? new Date(date).toLocaleDateString('zh-CN') : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) =>
        date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'draft' && (
            <Button
              type="link"
              icon={<RobotOutlined />}
              onClick={() => navigate(`/requirements/${record.id}/split`)}
              size="small"
            >
              AI拆解
            </Button>
          )}
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个需求吗？此操作不可恢复。"
            onConfirm={() => onDelete(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Error state
  if (error) {
    return (
      <Alert
        type="error"
        message="加载失败"
        description={error}
        showIcon
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            重试
          </Button>
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <Table<Requirement>
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      loading={loading}
      locale={{
        emptyText: <Empty description="暂无需求数据" />,
      }}
      pagination={{
        current: pagination.page,
        pageSize: pagination.page_size,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50'],
        onChange: onPageChange,
      }}
    />
  );
}
