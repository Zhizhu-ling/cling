import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Result,
  Spin,
  Typography,
  App,
  Space,
  Alert,
} from 'antd';
import {
  RobotOutlined,
  CheckOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { requirementsApi } from '@/api/requirements';
import type {
  RequirementDetail,
  AiGeneratedTask,
  SplitResult,
} from '@/api/requirements';
import { useAiJobPolling } from '@/hooks/useAiJobPolling';
import RequirementSummaryCard from './RequirementSummaryCard';
import TaskTreeView from './TaskTreeView';
import TaskEditDrawer from './TaskEditDrawer';

const { Title, Text } = Typography;

/**
 * Page states for the AI Split flow.
 */
type PageState =
  | 'loading' // Loading requirement detail
  | 'ready' // Requirement loaded, ready to trigger split
  | 'processing' // AI job submitted, polling in progress
  | 'result' // AI job completed, showing task tree
  | 'confirming' // Confirming the task tree
  | 'error'; // Error state with retry option

/**
 * Resolve a task from the tree by its path key (e.g., "0-1-2").
 */
function getTaskByPath(
  tasks: AiGeneratedTask[],
  path: string,
): AiGeneratedTask | null {
  const indices = path.split('-').map(Number);
  let current: AiGeneratedTask[] = tasks;
  let task: AiGeneratedTask | null = null;

  for (const idx of indices) {
    if (!current || idx >= current.length) return null;
    task = current[idx];
    current = task.children ?? [];
  }

  return task;
}

/**
 * Update a task in the tree by its path key, returning a new tree.
 */
function updateTaskByPath(
  tasks: AiGeneratedTask[],
  path: string,
  updatedTask: AiGeneratedTask,
): AiGeneratedTask[] {
  const indices = path.split('-').map(Number);
  const newTasks = structuredClone(tasks);

  let current: AiGeneratedTask[] = newTasks;
  for (let i = 0; i < indices.length - 1; i++) {
    current = current[indices[i]].children ?? [];
  }

  const lastIdx = indices[indices.length - 1];
  current[lastIdx] = { ...current[lastIdx], ...updatedTask };

  return newTasks;
}

/**
 * AI Split page - handles the full flow of:
 * 1. Loading requirement details
 * 2. Submitting AI decomposition job
 * 3. Polling for job completion
 * 4. Displaying the generated task tree
 * 5. Allowing task editing before confirmation
 * 6. Confirming and persisting the task tree
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */
export default function AiSplitPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<AiGeneratedTask[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Task edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingTaskPath, setEditingTaskPath] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<AiGeneratedTask | null>(null);

  // AI job polling
  const { status: jobStatus, data: jobData, error: jobError, isLoading: jobLoading, retry: retryJobPolling } =
    useAiJobPolling(jobId);

  const requirementId = id ? parseInt(id, 10) : null;

  /**
   * Load requirement detail.
   */
  const loadRequirement = useCallback(async () => {
    if (!requirementId) {
      setPageState('error');
      setErrorMessage('无效的需求 ID');
      return;
    }

    try {
      setPageState('loading');
      const response = await requirementsApi.getDetail(requirementId);
      setRequirement(response.data.data);
      setPageState('ready');
    } catch {
      setPageState('error');
      setErrorMessage('加载需求详情失败');
    }
  }, [requirementId]);

  /**
   * Submit AI split job.
   */
  const handleSplit = async () => {
    if (!requirementId) return;

    try {
      setPageState('processing');
      const response = await requirementsApi.split(requirementId);
      setJobId(response.data.data.job_id);
    } catch {
      setPageState('error');
      setErrorMessage('提交 AI 拆解任务失败');
    }
  };

  /**
   * Flatten tree structure to flat array with task_key and parent_key for backend.
   */
  const flattenTasks = (
    treeTasks: AiGeneratedTask[],
    parentKey?: string,
  ): Array<{
    task_key: string;
    title: string;
    description?: string;
    estimated_hours?: number;
    dependencies?: string[];
    acceptance_criteria?: string;
    parent_key?: string;
  }> => {
    const result: Array<any> = [];
    treeTasks.forEach((task, index) => {
      const taskKey = parentKey ? `${parentKey}.${index + 1}` : `T${index + 1}`;
      result.push({
        task_key: taskKey,
        title: task.title,
        description: task.description || undefined,
        estimated_hours: task.estimatedHours || undefined,
        dependencies: task.dependencies || [],
        acceptance_criteria: task.acceptanceCriteria || undefined,
        parent_key: parentKey || undefined,
      });
      if (task.children && task.children.length > 0) {
        result.push(...flattenTasks(task.children, taskKey));
      }
    });
    return result;
  };

  /**
   * Confirm the task tree and persist to database.
   */
  const handleConfirm = async () => {
    if (!requirementId || tasks.length === 0) return;

    try {
      setConfirmLoading(true);
      const flatTasks = flattenTasks(tasks);
      await requirementsApi.confirmSplit(requirementId, { tasks: flatTasks as any });
      message.success('任务树已确认并保存');
      navigate(`/requirements`);
    } catch {
      message.error('确认任务树失败，请重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  /**
   * Handle task selection from tree view - open edit drawer.
   */
  const handleSelectTask = (taskPath: string) => {
    const task = getTaskByPath(tasks, taskPath);
    if (task) {
      setEditingTaskPath(taskPath);
      setEditingTask(task);
      setEditDrawerOpen(true);
    }
  };

  /**
   * Handle task save from edit drawer.
   */
  const handleSaveTask = (updatedTask: AiGeneratedTask) => {
    if (editingTaskPath !== null) {
      const newTasks = updateTaskByPath(tasks, editingTaskPath, updatedTask);
      setTasks(newTasks);
    }
  };

  /**
   * Retry the entire flow from the beginning.
   */
  const handleRetry = () => {
    setJobId(null);
    setTasks([]);
    setErrorMessage('');
    retryJobPolling();
    if (requirement) {
      setPageState('ready');
    } else {
      loadRequirement();
    }
  };

  // Load requirement on mount
  useEffect(() => {
    loadRequirement();
  }, [loadRequirement]);

  // React to job polling status changes
  useEffect(() => {
    if (jobStatus === 'success' && jobData?.outputPayload) {
      const result = jobData.outputPayload as any;
      if (result.tasks && result.tasks.length > 0) {
        // AI 返回的是扁平结构（task_key + parent_key），需要转换为树形结构
        const flatTasks = result.tasks as Array<{
          task_key: string;
          title: string;
          description?: string;
          estimated_hours?: number;
          dependencies?: string[];
          acceptance_criteria?: string;
          parent_key?: string;
        }>;

        // 转换为树形结构
        const buildTree = (items: typeof flatTasks): AiGeneratedTask[] => {
          const rootTasks = items.filter((t) => !t.parent_key);
          const childMap = new Map<string, typeof flatTasks>();
          items.forEach((t) => {
            if (t.parent_key) {
              const children = childMap.get(t.parent_key) || [];
              children.push(t);
              childMap.set(t.parent_key, children);
            }
          });

          const convert = (task: typeof flatTasks[0]): AiGeneratedTask => {
            const children = childMap.get(task.task_key) || [];
            return {
              id: task.task_key,
              title: task.title,
              description: task.description || '',
              estimatedHours: task.estimated_hours || 0,
              acceptanceCriteria: task.acceptance_criteria || '',
              dependencies: task.dependencies || [],
              children: children.length > 0 ? children.map(convert) : undefined,
            };
          };

          return rootTasks.map(convert);
        };

        setTasks(buildTree(flatTasks));
        setPageState('result');
      } else {
        setPageState('error');
        setErrorMessage('AI 返回的任务树为空');
      }
    } else if (jobStatus === 'fail') {
      setPageState('error');
      setErrorMessage(jobError ?? 'AI 拆解任务失败');
    }
  }, [jobStatus, jobData, jobError]);

  // Render based on page state
  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/requirements')}
        >
          返回需求列表
        </Button>
      </Space>

      <Title level={4}>
        <RobotOutlined style={{ marginRight: 8 }} />
        AI 需求拆解
      </Title>

      {/* Requirement Summary */}
      {requirement && <RequirementSummaryCard requirement={requirement} />}

      {/* Loading state */}
      {pageState === 'loading' && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">加载需求详情...</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Ready state - show split button */}
      {pageState === 'ready' && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <RobotOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <div style={{ marginBottom: 24 }}>
              <Text>
                点击下方按钮，AI 将自动将需求拆解为结构化的任务树。
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<RobotOutlined />}
              onClick={handleSplit}
            >
              开始 AI 拆解
            </Button>
          </div>
        </Card>
      )}

      {/* Processing state - AI working */}
      {pageState === 'processing' && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text strong>AI 正在分析需求并生成任务树...</Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                {jobLoading ? '处理中，请稍候...' : '即将完成'}
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Result state - show task tree */}
      {pageState === 'result' && (
        <Card
          title="拆解结果"
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setJobId(null);
                  setTasks([]);
                  handleSplit();
                }}
              >
                重新拆解
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={confirmLoading}
                onClick={handleConfirm}
              >
                确认任务树
              </Button>
            </Space>
          }
        >
          <Alert
            message="请检查 AI 生成的任务树，点击任务可进行编辑，确认无误后点击「确认任务树」保存。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <TaskTreeView tasks={tasks} onSelectTask={handleSelectTask} />
        </Card>
      )}

      {/* Error state */}
      {pageState === 'error' && (
        <Card>
          <Result
            status="error"
            title="操作失败"
            subTitle={errorMessage}
            extra={[
              <Button
                key="retry"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRetry}
              >
                重试
              </Button>,
              <Button
                key="back"
                onClick={() => navigate('/requirements')}
              >
                返回需求列表
              </Button>,
            ]}
          />
        </Card>
      )}

      {/* Task Edit Drawer */}
      <TaskEditDrawer
        open={editDrawerOpen}
        task={editingTask}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingTask(null);
          setEditingTaskPath(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
}
