import { useState } from 'react';
import {
  Typography,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Form,
  InputNumber,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { TaskStatus, UpdateTaskStatusDto } from '@/api/tasks';

const { Title } = Typography;

/**
 * Status badge color mapping.
 */
const STATUS_CONFIG: Record<
  TaskStatus,
  { color: string; label: string }
> = {
  todo: { color: 'default', label: '待办' },
  doing: { color: 'processing', label: '进行中' },
  blocked: { color: 'error', label: '阻塞' },
  done: { color: 'success', label: '已完成' },
  delayed: { color: 'warning', label: '延期' },
};

/**
 * Valid transitions from each status (non-admin).
 */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['doing'],
  doing: ['blocked', 'delayed', 'done'],
  blocked: ['doing'],
  delayed: ['doing'],
  done: [],
};

/**
 * Button config for each target status.
 */
const TRANSITION_BUTTON_CONFIG: Record<
  TaskStatus,
  { icon: React.ReactNode; label: string; type?: 'primary' | 'default' }
> = {
  todo: { icon: <ClockCircleOutlined />, label: '待办' },
  doing: { icon: <PlayCircleOutlined />, label: '开始' },
  blocked: { icon: <StopOutlined />, label: '阻塞', type: 'default' },
  delayed: { icon: <PauseCircleOutlined />, label: '延期', type: 'default' },
  done: { icon: <CheckCircleOutlined />, label: '完成', type: 'primary' },
};

interface TaskDetailHeaderProps {
  taskId: number;
  title: string;
  status: TaskStatus;
  onStatusUpdate: (dto: UpdateTaskStatusDto) => Promise<void>;
  loading?: boolean;
}

/**
 * Task detail header with status badge and state-machine-aware action buttons.
 * Only shows valid transitions based on current status.
 */
export default function TaskDetailHeader({
  title,
  status,
  onStatusUpdate,
  loading = false,
}: TaskDetailHeaderProps) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);
  const [form] = Form.useForm();

  const validTransitions = TRANSITIONS[status] ?? [];
  const statusConfig = STATUS_CONFIG[status];

  const handleTransitionClick = (target: TaskStatus) => {
    if (target === 'blocked') {
      // Show modal for blocked reason
      setTargetStatus(target);
      setModalOpen(true);
    } else {
      // Direct transition
      onStatusUpdate({ status: target });
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await onStatusUpdate({
        status: targetStatus!,
        blocked_reason: values.blockedReason,
        note: values.note,
        progressPercent: values.progressPercent,
      });
      setModalOpen(false);
      form.resetFields();
    } catch {
      // Validation failed, do nothing
    }
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    form.resetFields();
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Space align="center" size="middle">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            aria-label="返回"
          />
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
        </Space>

        <Space>
          {validTransitions.map((target) => {
            const config = TRANSITION_BUTTON_CONFIG[target];
            return (
              <Button
                key={target}
                type={config.type ?? 'default'}
                icon={config.icon}
                onClick={() => handleTransitionClick(target)}
                loading={loading}
                disabled={loading}
              >
                {config.label}
              </Button>
            );
          })}
        </Space>
      </div>

      <Modal
        title="状态变更"
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          {targetStatus === 'blocked' && (
            <Form.Item
              name="blockedReason"
              label="阻塞原因"
              rules={[{ required: true, message: '请输入阻塞原因' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="请描述阻塞原因..."
                aria-label="阻塞原因"
              />
            </Form.Item>
          )}
          <Form.Item name="note" label="备注">
            <Input.TextArea
              rows={2}
              placeholder="可选备注..."
              aria-label="备注"
            />
          </Form.Item>
          <Form.Item
            name="progressPercent"
            label="进度 (%)"
            rules={[
              {
                type: 'number',
                min: 0,
                max: 100,
                message: '进度必须在 0-100 之间',
              },
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%' }}
              placeholder="0-100"
              aria-label="进度百分比"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
