import { Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import type { TaskData } from '@/api/tasks';

const { Text } = Typography;

/**
 * Priority label mapping.
 */
const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '紧急', color: 'red' },
  2: { label: '高', color: 'orange' },
  3: { label: '中', color: 'blue' },
  4: { label: '低', color: 'default' },
};

interface TaskAssignmentTableProps {
  tasks: TaskData[];
  loading: boolean;
  selectedTaskIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

/**
 * Table displaying unassigned tasks for assignment.
 * Supports row selection for batch operations.
 *
 * Validates: Requirements 4.1, 5.1, 5.3
 */
export default function TaskAssignmentTable({
  tasks,
  loading,
  selectedTaskIds,
  onSelectionChange,
  pagination,
}: TaskAssignmentTableProps) {
  const columns: TableProps<TaskData>['columns'] = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 250,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
      render: (text: string | null) => (
        <Text type="secondary" ellipsis={{ tooltip: text }}>
          {text ?? '-'}
        </Text>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number | null) => {
        if (!priority) return '-';
        const info = PRIORITY_MAP[priority];
        return info ? <Tag color={info.color}>{info.label}</Tag> : '-';
      },
    },
    {
      title: '预估工时',
      dataIndex: 'estimatedHours',
      key: 'estimatedHours',
      width: 100,
      render: (hours: number | null) => (hours != null ? `${hours}h` : '-'),
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          todo: 'default',
          doing: 'processing',
          blocked: 'error',
          done: 'success',
          delayed: 'warning',
        };
        return <Tag color={colorMap[status] ?? 'default'}>{status}</Tag>;
      },
    },
  ];

  const rowSelection: TableProps<TaskData>['rowSelection'] = {
    selectedRowKeys: selectedTaskIds,
    onChange: (selectedRowKeys) => {
      onSelectionChange(selectedRowKeys as number[]);
    },
  };

  return (
    <Table<TaskData>
      rowKey="id"
      columns={columns}
      dataSource={tasks}
      loading={loading}
      rowSelection={rowSelection}
      pagination={
        pagination
          ? {
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: pagination.onChange,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }
          : false
      }
      locale={{ emptyText: '暂无未分配任务' }}
      size="middle"
    />
  );
}
