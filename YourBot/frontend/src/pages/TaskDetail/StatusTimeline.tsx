import { Card, Timeline, Tag, Typography } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { StatusLog, TaskStatus } from '@/api/tasks';

const { Text } = Typography;

/**
 * Status display config for timeline items.
 */
const STATUS_TIMELINE_CONFIG: Record<
  TaskStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  todo: {
    color: 'gray',
    icon: <ClockCircleOutlined />,
    label: '待办',
  },
  doing: {
    color: 'blue',
    icon: <PlayCircleOutlined />,
    label: '进行中',
  },
  blocked: {
    color: 'red',
    icon: <StopOutlined />,
    label: '阻塞',
  },
  done: {
    color: 'green',
    icon: <CheckCircleOutlined />,
    label: '已完成',
  },
  delayed: {
    color: 'orange',
    icon: <PauseCircleOutlined />,
    label: '延期',
  },
};

/**
 * Format a datetime string for timeline display.
 */
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface StatusTimelineProps {
  statusLogs: StatusLog[];
}

/**
 * Timeline component showing task status history with timestamps and notes.
 * Displays logs in reverse chronological order (newest first).
 */
export default function StatusTimeline({ statusLogs }: StatusTimelineProps) {
  // Sort by createdAt descending (newest first)
  const sortedLogs = [...statusLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sortedLogs.length === 0) {
    return (
      <Card title="状态历史">
        <Text type="secondary">暂无状态变更记录</Text>
      </Card>
    );
  }

  const items = sortedLogs.map((log) => {
    const config = STATUS_TIMELINE_CONFIG[log.status];
    return {
      color: config.color,
      dot: config.icon,
      children: (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <Tag color={config.color}>{config.label}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDateTime(log.createdAt)}
            </Text>
            {log.creator && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                — {log.creator.name}
              </Text>
            )}
          </div>
          {log.progressPercent != null && (
            <div style={{ fontSize: 12, color: '#666' }}>
              进度: {log.progressPercent}%
            </div>
          )}
          {log.note && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              备注: {log.note}
            </div>
          )}
          {log.blockedReason && (
            <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 2 }}>
              阻塞原因: {log.blockedReason}
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <Card title="状态历史">
      <Timeline items={items} />
    </Card>
  );
}
