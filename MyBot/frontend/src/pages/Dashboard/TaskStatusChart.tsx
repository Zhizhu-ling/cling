import { Card, Progress, Space, Typography } from 'antd';
import type { TaskStatusDistributionItem } from '@/api/dashboard';

const { Text } = Typography;

interface TaskStatusChartProps {
  data: TaskStatusDistributionItem[] | Record<string, number> | null;
  loading: boolean;
}

/**
 * Status label and color mapping for task statuses.
 */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  todo: { label: '待办', color: '#d9d9d9' },
  doing: { label: '进行中', color: '#1890ff' },
  blocked: { label: '阻塞', color: '#faad14' },
  done: { label: '已完成', color: '#52c41a' },
  delayed: { label: '延期', color: '#ff4d4f' },
};

/**
 * Normalize data to array format regardless of input shape.
 */
function normalizeData(data: TaskStatusDistributionItem[] | Record<string, number> | null): TaskStatusDistributionItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Object format: { todo: 4, doing: 3, ... } → array
  return Object.entries(data).map(([status, count]) => ({
    status: status as any,
    count: typeof count === 'number' ? count : 0,
  }));
}

/**
 * Task status distribution chart using horizontal progress bars.
 */
export default function TaskStatusChart({ data, loading }: TaskStatusChartProps) {
  const items = normalizeData(data);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card title="任务状态分布" loading={loading}>
      {items.length === 0 ? (
        <Text type="secondary">暂无任务数据</Text>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status] ?? {
              label: item.status,
              color: '#d9d9d9',
            };
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;

            return (
              <div key={item.status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text>{config.label}</Text>
                  <Text type="secondary">
                    {item.count} 个 ({percent}%)
                  </Text>
                </div>
                <Progress
                  percent={percent}
                  strokeColor={config.color}
                  showInfo={false}
                  size="small"
                />
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
}
