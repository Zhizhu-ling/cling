import { Select, Space } from 'antd';
import type { RequirementStatus, RequirementPriority, RequirementQuery } from '@/api/requirement';

/**
 * Status options for the filter dropdown.
 */
const STATUS_OPTIONS: { label: string; value: RequirementStatus }[] = [
  { label: '草稿', value: 'draft' },
  { label: '分析中', value: 'analyzing' },
  { label: '已拆解', value: 'split_done' },
  { label: '已分配', value: 'assigned' },
  { label: '进行中', value: 'in_progress' },
  { label: '已关闭', value: 'closed' },
];

/**
 * Priority options for the filter dropdown.
 */
const PRIORITY_OPTIONS: { label: string; value: RequirementPriority }[] = [
  { label: '紧急', value: 1 },
  { label: '高', value: 2 },
  { label: '中', value: 3 },
  { label: '低', value: 4 },
];

/**
 * Sort field options.
 */
const SORT_BY_OPTIONS: { label: string; value: 'created_at' | 'due_date' }[] = [
  { label: '创建时间', value: 'created_at' },
  { label: '截止日期', value: 'due_date' },
];

/**
 * Sort order options.
 */
const SORT_ORDER_OPTIONS: { label: string; value: 'asc' | 'desc' }[] = [
  { label: '升序', value: 'asc' },
  { label: '降序', value: 'desc' },
];

interface RequirementFilterBarProps {
  filters: RequirementQuery;
  onChange: (filters: {
    status?: RequirementStatus;
    priority?: RequirementPriority;
    sort_by?: 'created_at' | 'due_date';
    sort_order?: 'asc' | 'desc';
  }) => void;
}

/**
 * Filter bar for requirements list.
 * Provides status, priority filters and sort options.
 */
export default function RequirementFilterBar({ filters, onChange }: RequirementFilterBarProps) {
  return (
    <Space wrap style={{ marginBottom: 16 }}>
      <Select
        placeholder="状态筛选"
        allowClear
        style={{ width: 140 }}
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(value) => onChange({ status: value })}
      />
      <Select
        placeholder="优先级筛选"
        allowClear
        style={{ width: 140 }}
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(value) => onChange({ priority: value })}
      />
      <Select
        placeholder="排序字段"
        style={{ width: 140 }}
        value={filters.sort_by}
        options={SORT_BY_OPTIONS}
        onChange={(value) => onChange({ sort_by: value })}
      />
      <Select
        placeholder="排序方式"
        style={{ width: 120 }}
        value={filters.sort_order}
        options={SORT_ORDER_OPTIONS}
        onChange={(value) => onChange({ sort_order: value })}
      />
    </Space>
  );
}
