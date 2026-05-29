import { useCallback, useEffect, useState } from 'react';
import { Typography, Space, App, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { tasksApi } from '@/api/tasks';
import type { TaskData, TaskStatus } from '@/api/tasks';
import MyTaskSummary from './MyTaskSummary';
import MyTaskList from './MyTaskList';
import { exportToCsv } from '@/utils/export';

const { Title } = Typography;

/**
 * My Tasks page - displays the current user's assigned tasks
 * with summary counts and a filterable task list.
 * Route: /tasks/my
 */
export default function MyTasksPage() {
  const user = useAuthStore((state) => state.user);
  const { message } = App.useApp();

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await tasksApi.getTasks({
        owner_id: user.id,
        page: 1,
        page_size: 100,
      });
      setTasks(response.data.data.list);
    } catch {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [user, message]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * 导出我的任务列表为 CSV。
   */
  const handleExportCsv = () => {
    const statusLabels: Record<string, string> = {
      todo: '待办',
      doing: '进行中',
      blocked: '阻塞',
      done: '已完成',
      delayed: '延期',
    };
    const headers = ['ID', '标题', '状态', '优先级', '进度(%)', '截止日期', '创建时间'];
    const rows = tasks.map((task) => [
      String(task.id),
      task.title,
      statusLabels[task.status] || task.status,
      task.priority != null ? String(task.priority) : '',
      task.progressPercent != null ? String(task.progressPercent) : '0',
      task.dueDate || '',
      task.createdAt,
    ]);
    exportToCsv('我的任务', headers, rows);
  };

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>我的任务</Title>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={tasks.length === 0}>
            导出CSV
          </Button>
        </div>

        <MyTaskSummary tasks={tasks} loading={loading} />

        <MyTaskList
          tasks={tasks}
          loading={loading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onTaskUpdated={fetchTasks}
        />
      </Space>
    </div>
  );
}
