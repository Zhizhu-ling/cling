import { Card, Descriptions, Progress, Typography } from 'antd';
import type { TaskDetail } from '@/api/tasks';

const { Text } = Typography;

/**
 * Priority label mapping.
 */
const PRIORITY_LABELS: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '中',
  4: '低',
};

/**
 * Format a date string to locale display.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a datetime string to locale display with time.
 */
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface TaskMetaCardProps {
  task: TaskDetail;
}

/**
 * Card displaying all task metadata fields.
 */
export default function TaskMetaCard({ task }: TaskMetaCardProps) {
  const progress = task.progressPercent ?? 0;

  return (
    <Card title="任务信息" style={{ marginBottom: 16 }}>
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label="所属需求">
          {task.requirement?.title ?? `-（ID: ${task.requirementId}）`}
        </Descriptions.Item>
        <Descriptions.Item label="负责人">
          {task.owner?.name ?? task.ownerName ?? '未分配'}
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          {task.priority ? PRIORITY_LABELS[task.priority] ?? `P${task.priority}` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="风险等级">
          {task.riskLevel ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="预估工时">
          {task.estimatedHours != null ? `${task.estimatedHours} 小时` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="实际工时">
          {task.actualHours != null ? `${task.actualHours} 小时` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="开始日期">
          {formatDate(task.startDate)}
        </Descriptions.Item>
        <Descriptions.Item label="截止日期">
          {formatDate(task.dueDate)}
        </Descriptions.Item>
        <Descriptions.Item label="完成时间">
          {formatDateTime(task.completedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {formatDateTime(task.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="进度" span={2}>
          <Progress percent={Number(progress)} size="small" />
        </Descriptions.Item>
      </Descriptions>

      {task.description && (
        <div style={{ marginTop: 16 }}>
          <Text strong>描述</Text>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {task.description}
          </div>
        </div>
      )}

      {task.acceptanceCriteria && (
        <div style={{ marginTop: 16 }}>
          <Text strong>验收标准</Text>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {task.acceptanceCriteria}
          </div>
        </div>
      )}

      {task.aiReason && (
        <div style={{ marginTop: 16 }}>
          <Text strong>AI 分配理由</Text>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#666' }}>
            {task.aiReason}
          </div>
        </div>
      )}
    </Card>
  );
}
