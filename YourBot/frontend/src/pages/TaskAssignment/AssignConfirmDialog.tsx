import { Modal, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';

const { Text } = Typography;

interface AssignmentItem {
  taskId: number;
  taskTitle: string;
  memberId: number;
  memberName: string;
}

interface AssignConfirmDialogProps {
  open: boolean;
  loading: boolean;
  assignments: AssignmentItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for batch task assignment.
 * Shows a summary table of all pending assignments before final confirmation.
 *
 * Validates: Requirements 5.1, 5.3
 */
export default function AssignConfirmDialog({
  open,
  loading,
  assignments,
  onConfirm,
  onCancel,
}: AssignConfirmDialogProps) {
  const columns: TableProps<AssignmentItem>['columns'] = [
    {
      title: '任务',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
      ellipsis: true,
      render: (title: string) => (
        <Text ellipsis={{ tooltip: title }}>{title}</Text>
      ),
    },
    {
      title: '分配给',
      dataIndex: 'memberName',
      key: 'memberName',
      width: 150,
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
  ];

  return (
    <Modal
      title="确认任务分配"
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="确认分配"
      cancelText="取消"
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          即将分配 <Text strong>{assignments.length}</Text> 个任务，请确认以下分配方案：
        </Text>
      </div>
      <Table<AssignmentItem>
        rowKey="taskId"
        columns={columns}
        dataSource={assignments}
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
      />
    </Modal>
  );
}
