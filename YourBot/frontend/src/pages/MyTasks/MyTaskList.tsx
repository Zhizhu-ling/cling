import { Table, Tag, Select, Space, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { TaskData, TaskStatus } from '@/api/tasks';
import TaskQuickUpdateForm from './TaskQuickUpdateForm';

const STATUS_TAG_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'blue' },
  doing: { label: '进行中', color: 'green' },
  blocked: { label: '阻塞', color: 'red' },
  done: { label: '已完成', color: 'default' },
  delayed: { label: '延期', color: 'orange' },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: '紧急', color: 'red' },
  2: { label: '高', color: 'orange' },
  3: { label: '中', color: 'blue' },
  4: { label: '低', color: 'default' },
};

interface MyTaskListProps {
  tasks: TaskData[];
  loading?: boolean;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  onTaskUpdated: () => void;
}

/**
 * MyTaskList displays a filterable table of the user's tasks.
 * Includes a status filter dropdown and inline quick-update buttons.
 */
export default function MyTaskList({
  tasks,
  loading,
  statusFilter,
  onStatusFilterChange,
  onTaskUpdated,
}: MyTaskListProps) {
  const navigate = useNavigate();
  const filteredTasks =
    statusFilter === 'all' ? tasks : tasks.filter((t) => t.status === statusFilter);

  const columns: ColumnsType<TaskData> = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: TaskData) => (
        <a onClick={() => navigate(`/tasks/${record.id}`)} style={{ cursor: 'pointer' }}>
          {title}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => {
        const config = STATUS_TAG_CONFIG[status];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number | null) => {
        if (priority == null) return '-';
        const config = PRIORITY_CONFIG[priority];
        if (!config) return priority;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progressPercent',
      key: 'progressPercent',
      width: 120,
      render: (progress: number | null) => (
        <Progress percent={progress ?? 0} size="small" />
      ),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string | null, record: TaskData) => {
        if (!date) return '-';
        const dueDate = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays < 0 && record.status !== 'done';
        const isUrgent = diffDays >= 0 && diffDays <= 3 && record.status !== 'done';
        const color = isOverdue ? '#ff4d4f' : isUrgent ? '#fa8c16' : undefined;
        const label = isOverdue ? `已逾期${Math.abs(diffDays)}天` : isUrgent ? `${diffDays}天后到期` : date.slice(0, 10);
        return <span style={{ color, fontWeight: (isOverdue || isUrgent) ? 600 : undefined }}>{label}</span>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <TaskQuickUpdateForm task={record} onStatusUpdated={onTaskUpdated} />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <span>状态筛选：</span>
        <Select
          value={statusFilter}
          onChange={onStatusFilterChange}
          style={{ width: 120 }}
          aria-label="状态筛选"
        >
          <Select.Option value="all">全部</Select.Option>
          <Select.Option value="todo">待办</Select.Option>
          <Select.Option value="doing">进行中</Select.Option>
          <Select.Option value="blocked">阻塞</Select.Option>
          <Select.Option value="done">已完成</Select.Option>
          <Select.Option value="delayed">延期</Select.Option>
        </Select>
      </Space>

      <Table<TaskData>
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="middle"
      />
    </div>
  );
}
