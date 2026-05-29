import { useCallback, useEffect, useState } from 'react';
import { Typography, Space, App } from 'antd';
import { dashboardApi } from '@/api/dashboard';
import type { BoardData, BoardQuery } from '@/api/dashboard';
import { useRealtimeEvents } from '@/hooks';
import FilterBar from './FilterBar';
import KanbanBoard from './KanbanBoard';

const { Title } = Typography;

/**
 * Kanban Board page - displays team task progress across status columns.
 * Supports filtering by requirement and assignee.
 * Auto-refreshes when a task.status_changed WebSocket event is received.
 *
 * Route: /tasks/board
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */
export default function KanbanBoardPage() {
  const { message } = App.useApp();

  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<BoardQuery>({});

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getBoard(filters);
      setBoardData(response.data.data);
    } catch {
      message.error('获取看板数据失败');
    } finally {
      setLoading(false);
    }
  }, [filters, message]);

  // Fetch board data on mount and when filters change
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Auto-refresh board when a task status changes via WebSocket
  useRealtimeEvents('task.status_changed', () => {
    fetchBoard();
  });

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>任务看板</Title>

        <FilterBar filters={filters} onChange={setFilters} />

        <KanbanBoard data={boardData} loading={loading} />
      </Space>
    </div>
  );
}
