import { Spin, Empty } from 'antd';
import type { BoardData } from '@/api/dashboard';
import type { TaskStatus } from '@/api/tasks';
import KanbanColumn from './KanbanColumn';

/**
 * Ordered list of columns to display on the board.
 */
const COLUMN_ORDER: TaskStatus[] = ['todo', 'doing', 'blocked', 'done', 'delayed'];

interface KanbanBoardProps {
  data: BoardData | null;
  loading: boolean;
}

/**
 * KanbanBoard renders the full board with all status columns.
 * Displays a loading spinner while data is being fetched,
 * and an empty state when no data is available.
 *
 * Validates: Requirements 7.1
 */
export default function KanbanBoard({ data, loading }: KanbanBoardProps) {
  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return <Empty description="暂无看板数据" />;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        padding: '4px 0',
        minHeight: 400,
      }}
    >
      {COLUMN_ORDER.map((status) => (
        <KanbanColumn key={status} status={status} tasks={data[status] || []} />
      ))}
    </div>
  );
}
