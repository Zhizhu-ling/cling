import { Card, Col, Row, Statistic } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { TaskData, TaskStatus } from '@/api/tasks';

/**
 * Status count summary for the current user's tasks.
 */
interface StatusCounts {
  todo: number;
  doing: number;
  blocked: number;
  done: number;
  delayed: number;
  total: number;
}

interface MyTaskSummaryProps {
  tasks: TaskData[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  todo: { label: '待办', color: '#1890ff', icon: <ClockCircleOutlined /> },
  doing: { label: '进行中', color: '#52c41a', icon: <PlayCircleOutlined /> },
  blocked: { label: '阻塞', color: '#f5222d', icon: <ExclamationCircleOutlined /> },
  done: { label: '已完成', color: '#8c8c8c', icon: <CheckCircleOutlined /> },
  delayed: { label: '延期', color: '#fa8c16', icon: <PauseCircleOutlined /> },
};

function computeStatusCounts(tasks: TaskData[]): StatusCounts {
  const counts: StatusCounts = { todo: 0, doing: 0, blocked: 0, done: 0, delayed: 0, total: tasks.length };
  for (const task of tasks) {
    const status = task.status as keyof Omit<StatusCounts, 'total'>;
    if (status in counts) {
      counts[status]++;
    }
  }
  return counts;
}

/**
 * MyTaskSummary displays task counts grouped by status.
 */
export default function MyTaskSummary({ tasks, loading }: MyTaskSummaryProps) {
  const counts = computeStatusCounts(tasks);

  return (
    <Row gutter={[16, 16]}>
      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => {
        const config = STATUS_CONFIG[status];
        return (
          <Col key={status} xs={12} sm={8} md={4}>
            <Card loading={loading} size="small">
              <Statistic
                title={config.label}
                value={counts[status]}
                prefix={config.icon}
                valueStyle={{ color: config.color }}
              />
            </Card>
          </Col>
        );
      })}
      <Col xs={12} sm={8} md={4}>
        <Card loading={loading} size="small">
          <Statistic title="总计" value={counts.total} />
        </Card>
      </Col>
    </Row>
  );
}
