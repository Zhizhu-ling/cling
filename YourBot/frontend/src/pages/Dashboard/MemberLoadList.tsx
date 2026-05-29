import { Card, Table, Progress, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MemberWorkloadItem } from '@/api/dashboard';

const { Text } = Typography;

interface MemberLoadListProps {
  data: MemberWorkloadItem[] | null;
  loading: boolean;
}

/**
 * Member workload list showing assigned tasks, completed tasks,
 * and workload utilization per team member.
 *
 * Validates: Requirements 9.3
 */
export default function MemberLoadList({ data, loading }: MemberLoadListProps) {
  const columns: ColumnsType<MemberWorkloadItem> = [
    {
      title: '成员',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '分配任务',
      dataIndex: 'assigned_tasks',
      key: 'assigned_tasks',
      width: 90,
      align: 'center',
    },
    {
      title: '已完成',
      dataIndex: 'completed_tasks',
      key: 'completed_tasks',
      width: 80,
      align: 'center',
    },
    {
      title: '工作负载',
      key: 'workload',
      render: (_, record) => {
        const available = record.available_hours || 1;
        const utilization = Math.round(
          (record.current_workload_hours / available) * 100,
        );
        const status =
          utilization > 100
            ? 'exception'
            : utilization > 80
              ? 'active'
              : 'normal';

        return (
          <div>
            <Progress
              percent={Math.min(utilization, 100)}
              size="small"
              status={status}
              format={() => `${utilization}%`}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.current_workload_hours}h / {record.available_hours}h
            </Text>
          </div>
        );
      },
    },
  ];

  return (
    <Card title="成员工作负载">
      <Table<MemberWorkloadItem>
        columns={columns}
        dataSource={data ?? []}
        loading={loading}
        rowKey="user_id"
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无成员数据' }}
      />
    </Card>
  );
}
