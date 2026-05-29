import { useState, useEffect, useCallback } from 'react';
import { Button, App, Typography } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { requirementApi } from '@/api/requirement';
import type {
  Requirement,
  RequirementQuery,
  RequirementStatus,
  RequirementPriority,
  CreateRequirementParams,
  UpdateRequirementParams,
} from '@/api/requirement';
import RequirementFilterBar from './RequirementFilterBar';
import RequirementTable from './RequirementTable';
import RequirementFormDrawer from './RequirementFormDrawer';
import { exportToCsv } from '@/utils/export';

const { Title } = Typography;

/**
 * Requirements management page.
 * Provides listing, filtering, creation, and editing of requirements.
 */
export default function RequirementsPage() {
  const { message } = App.useApp();

  // Data state
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });

  // Filter state
  const [filters, setFilters] = useState<RequirementQuery>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Fetch requirements from the API.
   */
  const fetchRequirements = useCallback(async (query: RequirementQuery) => {
    setLoading(true);
    setError(null);
    try {
      const response = await requirementApi.list(query);
      const data = response.data.data;
      setRequirements(data.list);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '获取需求列表失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequirements(filters);
  }, [filters, fetchRequirements]);

  /**
   * Handle filter changes from the filter bar.
   */
  const handleFilterChange = (newFilters: {
    status?: RequirementStatus;
    priority?: RequirementPriority;
    sort_by?: 'created_at' | 'due_date';
    sort_order?: 'asc' | 'desc';
  }) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  };

  /**
   * Handle pagination change.
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      page_size: pageSize,
    }));
  };

  /**
   * Open drawer for creating a new requirement.
   */
  const handleCreate = () => {
    setEditingRequirement(null);
    setDrawerOpen(true);
  };

  /**
   * Open drawer for editing an existing requirement.
   */
  const handleEdit = (requirement: Requirement) => {
    setEditingRequirement(requirement);
    setDrawerOpen(true);
  };

  /**
   * Handle requirement deletion.
   */
  const handleDelete = async (requirement: Requirement) => {
    try {
      await requirementApi.delete(requirement.id);
      message.success('需求已删除');
      fetchRequirements(filters);
    } catch {
      message.error('删除需求失败');
    }
  };

  /**
   * Handle form submission (create or update).
   */
  const handleSubmit = async (values: CreateRequirementParams | UpdateRequirementParams) => {
    setSubmitting(true);
    try {
      if (editingRequirement) {
        await requirementApi.update(editingRequirement.id, values as UpdateRequirementParams);
        message.success('需求更新成功');
      } else {
        await requirementApi.create(values as CreateRequirementParams);
        message.success('需求创建成功');
      }
      setDrawerOpen(false);
      setEditingRequirement(null);
      fetchRequirements(filters);
    } catch {
      message.error(editingRequirement ? '需求更新失败' : '需求创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 导出当前需求列表为 CSV。
   */
  const handleExportCsv = () => {
    const priorityLabels: Record<number, string> = { 1: '紧急', 2: '高', 3: '中', 4: '低' };
    const headers = ['ID', '标题', '状态', '优先级', '截止日期', '创建时间'];
    const rows = requirements.map((req) => [
      String(req.id),
      req.title,
      req.status,
      priorityLabels[req.priority] || String(req.priority),
      req.due_date,
      req.created_at,
    ]);
    exportToCsv('需求列表', headers, rows);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>需求管理</Title>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv} disabled={requirements.length === 0}>
            导出CSV
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建需求
          </Button>
        </div>
      </div>

      <RequirementFilterBar
        filters={filters}
        onChange={handleFilterChange}
      />

      <RequirementTable
        dataSource={requirements}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRetry={() => fetchRequirements(filters)}
      />

      <RequirementFormDrawer
        open={drawerOpen}
        requirement={editingRequirement}
        submitting={submitting}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRequirement(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
