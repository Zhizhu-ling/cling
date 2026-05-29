import { Card, Descriptions, Tag } from 'antd';
import type { RequirementDetail } from '@/api/requirements';
import { PRIORITY_MAP } from '@/api/requirements';

/**
 * Priority color mapping for tags.
 */
const PRIORITY_COLORS: Record<number, string> = {
  1: 'red',
  2: 'orange',
  3: 'blue',
  4: 'default',
};

/**
 * Status label mapping.
 */
const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  analyzing: '分析中',
  split_done: '已拆解',
  assigned: '已分配',
  in_progress: '进行中',
  closed: '已关闭',
};

interface RequirementSummaryCardProps {
  requirement: RequirementDetail;
}

/**
 * Displays a summary card with key requirement details.
 * Shows title, priority, due date, status, objective, and deliverables.
 *
 * Validates: Requirements 3.1, 3.2
 */
export default function RequirementSummaryCard({
  requirement,
}: RequirementSummaryCardProps) {
  return (
    <Card title="需求概要" style={{ marginBottom: 16 }}>
      <Descriptions column={2} size="small">
        <Descriptions.Item label="标题" span={2}>
          {requirement.title}
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          <Tag color={PRIORITY_COLORS[requirement.priority] ?? 'default'}>
            {PRIORITY_MAP[requirement.priority] ?? '未知'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="截止日期">
          {requirement.dueDate}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag>{STATUS_MAP[requirement.status] ?? requirement.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="目标" span={2}>
          {requirement.objective}
        </Descriptions.Item>
        {requirement.deliverables && requirement.deliverables.length > 0 && (
          <Descriptions.Item label="交付物" span={2}>
            {requirement.deliverables.join('、')}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
}
