import { Badge, Typography } from 'antd';
import type { BoardTaskItem } from '@/api/dashboard';
import type { TaskStatus } from '@/api/tasks';
import TaskCard from './TaskCard';

const { Text } = Typography;

/**
 * Column configuration: display name and header color.
 */
const COLUMN_CONFIG: Record<TaskStatus, { title: string; color: string }> = {
  todo: { title: '待办', color: '#1677ff' },
  doing: { title: '进行中', color: '#52c41a' },
  blocked: { title: '阻塞', color: '#ff4d4f' },
  done: { title: '已完成', color: '#8c8c8c' },
  delayed: { title: '延期', color: '#faad14' },
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: BoardTaskItem[];
}

/**
 * KanbanColumn renders a single column of the Kanban board.
 * Displays a header with status name and task count, followed by task cards.
 *
 * Validates: Requirements 7.1
 */
export default function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status];

  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        backgroundColor: '#fafafa',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `2px solid ${config.color}`,
        }}
      >
        <Text strong>{config.title}</Text>
        <Badge count={tasks.length} color={config.color} />
      </div>

      {/* Task cards */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            暂无任务
          </Text>
        )}
      </div>
    </div>
  );
}
