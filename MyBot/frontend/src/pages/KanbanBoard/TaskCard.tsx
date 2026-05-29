import { Card, Tag, Typography } from 'antd';
import { UserOutlined, CalendarOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { BoardTaskItem } from '@/api/dashboard';

const { Text } = Typography;

/**
 * Priority label and color mapping.
 */
const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '紧急', color: 'red' },
  2: { label: '高', color: 'orange' },
  3: { label: '中', color: 'blue' },
  4: { label: '低', color: 'default' },
};

interface TaskCardProps {
  task: BoardTaskItem;
}

/**
 * TaskCard displays a single task on the Kanban board.
 * Shows title, owner, priority tag, due date, and blocked reason.
 */
export default function TaskCard({ task }: TaskCardProps) {
  const priority = task.priority ? PRIORITY_MAP[task.priority] : null;
  const navigate = useNavigate();

  return (
    <Card
      size="small"
      style={{ marginBottom: 8, cursor: 'pointer' }}
      styles={{ body: { padding: '12px' } }}
      onClick={() => navigate(`/tasks/${task.id}`)}
      hoverable
    >
      <div style={{ marginBottom: 8 }}>
        <Text strong ellipsis style={{ display: 'block' }}>
          {task.title}
        </Text>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <UserOutlined style={{ fontSize: 12, color: '#999' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {task.owner_name || '未分配'}
          </Text>
        </div>

        {priority && <Tag color={priority.color}>{priority.label}</Tag>}
      </div>

      {task.due_date && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <CalendarOutlined style={{ fontSize: 12, color: '#999' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(task.due_date).toLocaleDateString('zh-CN')}
          </Text>
        </div>
      )}

      {task.blocked_reason && (
        <div style={{ marginTop: 6, padding: '4px 8px', background: '#fff2f0', borderRadius: 4 }}>
          <StopOutlined style={{ fontSize: 12, color: '#ff4d4f', marginRight: 4 }} />
          <Text type="danger" style={{ fontSize: 12 }}>
            {task.blocked_reason}
          </Text>
        </div>
      )}
    </Card>
  );
}
