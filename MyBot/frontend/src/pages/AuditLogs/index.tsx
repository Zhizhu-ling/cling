import { useCallback, useEffect, useState } from 'react';
import { Table, Typography, Select, Space, App } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { apiClient } from '@/api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface AuditLogItem {
  id: number;
  entityType: string;
  entityId: number;
  operation: string;
  operatorId: number;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  requestId: string | null;
  createdAt: string;
  operator: { id: number; name: string };
}

interface AuditLogQuery {
  page: number;
  page_size: number;
  entity_type?: string;
  operation?: string;
}

/**
 * 审计日志页面 - 仅管理员可访问。
 * 显示系统操作日志，支持按实体类型和操作类型过滤。
 */
export default function AuditLogsPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [filters, setFilters] = useState<AuditLogQuery>({ page: 1, page_size: 20 });

  const fetchLogs = useCallback(async (query: AuditLogQuery) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: query.page,
        page_size: query.page_size,
      };
      if (query.entity_type) params.entity_type = query.entity_type;
      if (query.operation) params.operation = query.operation;

      const response = await apiClient.get('/audit-logs', { params });
      const result = response.data.data;
      setData(result.list);
      setPagination(result.pagination);
    } catch {
      message.error('获取审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchLogs(filters);
  }, [filters, fetchLogs]);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: paginationConfig.current || 1,
      page_size: paginationConfig.pageSize || 20,
    }));
  };

  const handleEntityTypeChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, entity_type: value, page: 1 }));
  };

  const handleOperationChange = (value: string | undefined) => {
    setFilters((prev) => ({ ...prev, operation: value, page: 1 }));
  };

  const columns: ColumnsType<AuditLogItem> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
      width: 120,
    },
    {
      title: '实体类型',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 120,
    },
    {
      title: '实体ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 100,
    },
    {
      title: '操作人',
      dataIndex: ['operator', 'name'],
      key: 'operatorName',
      width: 100,
    },
    {
      title: '详情',
      key: 'detail',
      ellipsis: true,
      render: (_: unknown, record: AuditLogItem) => {
        const snapshot = record.afterSnapshot || record.beforeSnapshot;
        if (!snapshot) return '-';
        try {
          return JSON.stringify(snapshot).slice(0, 100);
        } catch {
          return '-';
        }
      },
    },
  ];

  // 实体类型选项
  const entityTypeOptions = [
    { label: '全部', value: '' },
    { label: '需求', value: 'requirement' },
    { label: '任务', value: 'task' },
    { label: '用户', value: 'user' },
    { label: 'AI任务', value: 'ai_job' },
  ];

  // 操作类型选项
  const operationOptions = [
    { label: '全部', value: '' },
    { label: '创建', value: 'create' },
    { label: '更新', value: 'update' },
    { label: '删除', value: 'delete' },
    { label: '状态变更', value: 'status_change' },
    { label: '分配', value: 'assign' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>操作日志</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="实体类型"
          allowClear
          style={{ width: 140 }}
          options={entityTypeOptions}
          onChange={(val) => handleEntityTypeChange(val || undefined)}
          value={filters.entity_type || ''}
        />
        <Select
          placeholder="操作类型"
          allowClear
          style={{ width: 140 }}
          options={operationOptions}
          onChange={(val) => handleOperationChange(val || undefined)}
          value={filters.operation || ''}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
      />
    </div>
  );
}
