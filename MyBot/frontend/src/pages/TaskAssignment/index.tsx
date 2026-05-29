import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Space,
  Typography,
  App,
  Alert,
  Spin,
  Select,
  Row,
  Col,
} from 'antd';
import { RobotOutlined, UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAiJobPolling } from '@/hooks/useAiJobPolling';
import { tasksApi } from '@/api/tasks';
import type {
  TaskData,
  AssignmentSuggestion,
  MemberProfile,
} from '@/api/tasks';
import TaskAssignmentTable from './TaskAssignmentTable';
import MemberRecommendCard from './MemberRecommendCard';
import AssignConfirmDialog from './AssignConfirmDialog';

const { Title, Text } = Typography;

/**
 * Task Assignment page.
 * Flow: show unassigned tasks → request AI suggestions → poll → display recommendations → confirm assignment.
 * Allows manual member selection as fallback when AI fails.
 *
 * Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.2, 5.3
 */
export default function TaskAssignmentPage() {
  const { message } = App.useApp();

  // Task list state
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  // Selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);

  // AI suggestion state
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AssignmentSuggestion[]>([]);
  const [requestingAi, setRequestingAi] = useState(false);

  // Manual assignment state
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAssignments, setManualAssignments] = useState<Map<number, number>>(
    new Map(),
  );

  // Assignment confirmation state
  const [selectedAssignments, setSelectedAssignments] = useState<Map<number, number>>(
    new Map(),
  );
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // AI job polling
  const { status: jobStatus, data: jobData, error: jobError, isLoading: jobPolling, retry: retryJob } =
    useAiJobPolling(aiJobId);

  /**
   * Fetch unassigned tasks (owner_id is null).
   */
  const fetchTasks = useCallback(async (page = 1, pageSize = 20) => {
    setTasksLoading(true);
    try {
      const response = await tasksApi.getTasks({
        page,
        page_size: pageSize,
        owner_id: null,
      });
      const data = response.data.data;
      setTasks(data.list);
      setPagination({
        page: data.pagination.page,
        pageSize: data.pagination.page_size,
        total: data.pagination.total,
      });
    } catch {
      message.error('获取任务列表失败');
    } finally {
      setTasksLoading(false);
    }
  }, [message]);

  /**
   * Fetch active members for manual assignment.
   */
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const response = await tasksApi.getActiveMembers();
      // /users 端点返回的 id 就是 userId，需要映射
      const rawList = response.data.data.list as any[];
      setMembers(rawList.map((m: any) => ({
        ...m,
        userId: Number(m.id),
        name: m.name,
      })));
    } catch {
      message.error('获取成员列表失败');
    } finally {
      setMembersLoading(false);
    }
  }, [message]);

  // Initial load
  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, [fetchTasks, fetchMembers]);

  /**
   * Handle AI job completion - extract suggestions from output.
   */
  useEffect(() => {
    if (jobStatus === 'success' && jobData?.outputPayload) {
      try {
        const output = jobData.outputPayload as { suggestions?: AssignmentSuggestion[] };
        if (output.suggestions && Array.isArray(output.suggestions)) {
          setSuggestions(output.suggestions);
          // Auto-select top recommendation for each task
          const autoSelected = new Map<number, number>();
          for (const s of output.suggestions) {
            if (s.recommendations.length > 0) {
              autoSelected.set(s.taskId, s.recommendations[0].memberId);
            }
          }
          setSelectedAssignments(autoSelected);
        }
      } catch {
        message.error('解析 AI 建议结果失败');
      }
    }
  }, [jobStatus, jobData, message]);

  /**
   * Request AI assignment suggestions for selected tasks.
   */
  const handleRequestAiSuggestions = async () => {
    if (selectedTaskIds.length === 0) {
      message.warning('请先选择需要分配的任务');
      return;
    }

    setRequestingAi(true);
    setSuggestions([]);
    setManualMode(false);
    setSelectedAssignments(new Map());

    try {
      const response = await tasksApi.requestAssignmentSuggestions(selectedTaskIds);
      const jobId = response.data.data.job_id;
      setAiJobId(jobId);
    } catch {
      message.error('请求 AI 建议失败');
      setManualMode(true);
    } finally {
      setRequestingAi(false);
    }
  };

  /**
   * Switch to manual assignment mode.
   */
  const handleSwitchToManual = () => {
    setManualMode(true);
    setAiJobId(null);
    setSuggestions([]);
    setSelectedAssignments(new Map());
    setManualAssignments(new Map());
  };

  /**
   * Handle member selection from AI suggestions.
   */
  const handleSelectMember = (taskId: number, memberId: number) => {
    setSelectedAssignments((prev) => {
      const next = new Map(prev);
      if (next.get(taskId) === memberId) {
        next.delete(taskId);
      } else {
        next.set(taskId, memberId);
      }
      return next;
    });
  };

  /**
   * Handle manual member selection for a task.
   */
  const handleManualSelect = (taskId: number, memberId: number) => {
    setManualAssignments((prev) => {
      const next = new Map(prev);
      next.set(taskId, memberId);
      return next;
    });
  };

  /**
   * Get the effective assignments (from AI or manual).
   */
  const effectiveAssignments = useMemo(() => {
    return manualMode ? manualAssignments : selectedAssignments;
  }, [manualMode, manualAssignments, selectedAssignments]);

  /**
   * Build assignment items for the confirmation dialog.
   */
  const assignmentItems = useMemo(() => {
    const items: { taskId: number; taskTitle: string; memberId: number; memberName: string }[] = [];
    for (const [taskId, memberId] of effectiveAssignments) {
      const task = tasks.find((t) => t.id === taskId);
      const member = members.find((m) => m.userId === memberId);
      // Also check AI suggestions for member name
      let memberName = member?.name ?? '';
      if (!memberName) {
        for (const s of suggestions) {
          const rec = s.recommendations.find((r) => r.memberId === memberId);
          if (rec) {
            memberName = rec.memberName;
            break;
          }
        }
      }
      items.push({
        taskId,
        taskTitle: task?.title ?? `任务 #${taskId}`,
        memberId,
        memberName: memberName || `成员 #${memberId}`,
      });
    }
    return items;
  }, [effectiveAssignments, tasks, members, suggestions]);

  /**
   * Open confirmation dialog.
   */
  const handleOpenConfirm = () => {
    if (effectiveAssignments.size === 0) {
      message.warning('请先为任务选择分配成员');
      return;
    }
    setConfirmDialogOpen(true);
  };

  /**
   * Confirm and execute batch assignment.
   */
  const handleConfirmAssign = async () => {
    setAssigning(true);
    try {
      const assignments = Array.from(effectiveAssignments.entries()).map(
        ([taskId, memberId]) => ({ task_id: Number(taskId), member_id: Number(memberId) }),
      );
      await tasksApi.assignTasks({ assignments });
      message.success(`成功分配 ${assignments.length} 个任务`);
      setConfirmDialogOpen(false);
      // Reset state and refresh
      setSelectedTaskIds([]);
      setSuggestions([]);
      setSelectedAssignments(new Map());
      setManualAssignments(new Map());
      setAiJobId(null);
      setManualMode(false);
      fetchTasks(pagination.page, pagination.pageSize);
    } catch {
      message.error('任务分配失败，请重试');
    } finally {
      setAssigning(false);
    }
  };

  /**
   * Determine if AI failed and manual mode should be offered.
   */
  const aiHasFailed = jobStatus === 'fail' || !!jobError;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          任务分配
        </Title>
        <Text type="secondary">
          选择未分配的任务，使用 AI 智能推荐或手动分配成员
        </Text>
      </div>

      {/* Action bar */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleRequestAiSuggestions}
            loading={requestingAi || jobPolling}
            disabled={selectedTaskIds.length === 0}
          >
            AI 智能推荐
          </Button>
          <Button
            icon={<UserAddOutlined />}
            onClick={handleSwitchToManual}
            disabled={selectedTaskIds.length === 0}
          >
            手动分配
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchTasks(pagination.page, pagination.pageSize)}
          >
            刷新
          </Button>
          {effectiveAssignments.size > 0 && (
            <Button type="primary" ghost onClick={handleOpenConfirm}>
              确认分配 ({effectiveAssignments.size})
            </Button>
          )}
        </Space>
      </Card>

      <Row gutter={24}>
        {/* Left: Task table */}
        <Col xs={24} lg={manualMode || suggestions.length > 0 ? 14 : 24}>
          <Card title="未分配任务">
            <TaskAssignmentTable
              tasks={tasks}
              loading={tasksLoading}
              selectedTaskIds={selectedTaskIds}
              onSelectionChange={setSelectedTaskIds}
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) => fetchTasks(page, pageSize),
              }}
            />
          </Card>
        </Col>

        {/* Right: AI suggestions or manual assignment */}
        {(suggestions.length > 0 || manualMode || jobPolling || aiHasFailed) && (
          <Col xs={24} lg={10}>
            {/* AI polling in progress */}
            {jobPolling && (
              <Card title="AI 分析中">
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">AI 正在分析成员能力和任务匹配度...</Text>
                  </div>
                </div>
              </Card>
            )}

            {/* AI failed - show error and manual fallback */}
            {aiHasFailed && !jobPolling && (
              <Card title="AI 建议">
                <Alert
                  type="warning"
                  message="AI 建议获取失败"
                  description={jobError ?? 'AI 服务暂时不可用，您可以手动分配任务'}
                  showIcon
                  style={{ marginBottom: 16 }}
                  action={
                    <Space direction="vertical" size="small">
                      <Button size="small" onClick={retryJob}>
                        重试
                      </Button>
                      <Button size="small" onClick={handleSwitchToManual}>
                        手动分配
                      </Button>
                    </Space>
                  }
                />
              </Card>
            )}

            {/* AI suggestions display */}
            {suggestions.length > 0 && !jobPolling && !aiHasFailed && (
              <MemberRecommendCard
                suggestions={suggestions}
                selectedAssignments={selectedAssignments}
                onSelectMember={handleSelectMember}
              />
            )}

            {/* Manual assignment mode */}
            {manualMode && !jobPolling && (
              <Card title="手动分配" loading={membersLoading}>
                {selectedTaskIds.length === 0 ? (
                  <Alert
                    type="info"
                    message="请先在左侧表格中选择需要分配的任务"
                    showIcon
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedTaskIds.map((taskId) => {
                      const task = tasks.find((t) => t.id === taskId);
                      return (
                        <Card key={taskId} size="small">
                          <div style={{ marginBottom: 8 }}>
                            <Text strong ellipsis>
                              {task?.title ?? `任务 #${taskId}`}
                            </Text>
                          </div>
                          <Select
                            placeholder="选择成员"
                            style={{ width: '100%' }}
                            value={manualAssignments.get(taskId) ?? undefined}
                            onChange={(value) => handleManualSelect(taskId, Number(value))}
                            options={members.map((m) => ({
                              label: m.name,
                              value: Number(m.userId),
                            }))}
                            showSearch
                            filterOption={(input, option) =>
                              (option?.label as string)
                                ?.toLowerCase()
                                .includes(input.toLowerCase()) ?? false
                            }
                          />
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </Col>
        )}
      </Row>

      {/* Confirmation dialog */}
      <AssignConfirmDialog
        open={confirmDialogOpen}
        loading={assigning}
        assignments={assignmentItems}
        onConfirm={handleConfirmAssign}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </div>
  );
}
