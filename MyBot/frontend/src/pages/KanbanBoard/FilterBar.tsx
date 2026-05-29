import { useCallback, useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import apiClient from '@/api/client';
import type { ApiResponse } from '@/api/client';
import type { BoardQuery } from '@/api/dashboard';

interface RequirementOption {
  id: number;
  title: string;
}

interface MemberOption {
  id: number;
  name: string;
}

interface FilterBarProps {
  filters: BoardQuery;
  onChange: (filters: BoardQuery) => void;
}

/**
 * FilterBar provides requirement and assignee filters for the Kanban board.
 * Fetches available requirements and members for dropdown options.
 *
 * Validates: Requirements 7.3
 */
export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchRequirements = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const response = await apiClient.get<
        ApiResponse<{ list: RequirementOption[] }>
      >('/requirements', { params: { page_size: 100 } });
      setRequirements(response.data.data.list || []);
    } catch {
      // Silently fail - filter will just have no options
    } finally {
      setLoadingReqs(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const response = await apiClient.get<
        ApiResponse<{ list: MemberOption[] }>
      >('/users', { params: { role: 'member', status: 'active', page_size: 100 } });
      setMembers(response.data.data.list || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    fetchRequirements();
    fetchMembers();
  }, [fetchRequirements, fetchMembers]);

  return (
    <Space wrap>
      <Select
        placeholder="按需求筛选"
        allowClear
        showSearch
        optionFilterProp="label"
        loading={loadingReqs}
        style={{ minWidth: 200 }}
        value={filters.requirement_id ?? undefined}
        onChange={(value) => onChange({ ...filters, requirement_id: value })}
        options={requirements.map((r) => ({
          value: r.id,
          label: r.title,
        }))}
      />

      <Select
        placeholder="按负责人筛选"
        allowClear
        showSearch
        optionFilterProp="label"
        loading={loadingMembers}
        style={{ minWidth: 160 }}
        value={filters.owner_id ?? undefined}
        onChange={(value) => onChange({ ...filters, owner_id: value })}
        options={members.map((m) => ({
          value: m.id,
          label: m.name,
        }))}
      />
    </Space>
  );
}
