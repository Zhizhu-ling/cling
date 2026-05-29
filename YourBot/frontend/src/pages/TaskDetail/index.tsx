import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, App, Row, Col } from 'antd';
import { tasksApi } from '@/api/tasks';
import type { TaskDetail, UpdateTaskStatusDto } from '@/api/tasks';
import TaskDetailHeader from './TaskDetailHeader';
import TaskMetaCard from './TaskMetaCard';
import StatusTimeline from './StatusTimeline';
import TaskComments from './TaskComments';

/**
 * Task Detail page at route /tasks/:id.
 * Fetches task data including status logs and renders:
 * - TaskDetailHeader with status badge and action buttons
 * - TaskMetaCard showing all task metadata
 * - StatusTimeline showing task status history
 */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await tasksApi.getTask(id);
      setTask(response.data.data);
    } catch {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusUpdate = async (dto: UpdateTaskStatusDto) => {
    if (!id) return;
    try {
      setUpdating(true);
      await tasksApi.updateTaskStatus(id, dto);
      message.success('状态更新成功');
      // Refresh task data to get updated status and logs
      await fetchTask();
    } catch {
      message.error('状态更新失败');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>任务不存在或加载失败</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <TaskDetailHeader
        taskId={task.id}
        title={task.title}
        status={task.status}
        onStatusUpdate={handleStatusUpdate}
        loading={updating}
      />

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <TaskMetaCard task={task} />
        </Col>
        <Col xs={24} lg={8}>
          <StatusTimeline statusLogs={task.statusLogs} />
        </Col>
      </Row>

      <TaskComments taskId={task.id} />
    </div>
  );
}
