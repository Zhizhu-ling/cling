import { useState } from 'react';
import { Button, Input, Modal, Space, App } from 'antd';
import type { TaskData, TaskStatus } from '@/api/tasks';
import { tasksApi } from '@/api/tasks';

/**
 * Valid transitions map matching the backend state machine.
 * todo → doing
 * doing → blocked, delayed, done
 * blocked → doing
 * delayed → doing
 * done → (none)
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['doing'],
  doing: ['blocked', 'delayed', 'done'],
  blocked: ['doing'],
  delayed: ['doing'],
  done: [],
};

const STATUS_BUTTON_CONFIG: Record<TaskStatus, { label: string }> = {
  todo: { label: '待办' },
  doing: { label: '开始' },
  blocked: { label: '阻塞' },
  done: { label: '完成' },
  delayed: { label: '延期' },
};

interface TaskQuickUpdateFormProps {
  task: TaskData;
  onStatusUpdated: () => void;
}

/**
 * TaskQuickUpdateForm shows state-machine-aware transition buttons.
 * Only valid transitions from the current status are displayed.
 * When transitioning to "blocked", a modal prompts for blocked_reason.
 */
export default function TaskQuickUpdateForm({ task, onStatusUpdated }: TaskQuickUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const { message } = App.useApp();

  const validTargets: TaskStatus[] = VALID_TRANSITIONS[task.status] ?? [];

  const handleTransition = async (targetStatus: TaskStatus) => {
    // If transitioning to blocked, show modal for reason input
    if (targetStatus === 'blocked') {
      setBlockedReason('');
      setBlockedModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      await tasksApi.updateTaskStatus(task.id, { status: targetStatus });
      message.success('状态更新成功');
      onStatusUpdated();
    } catch {
      message.error('状态更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockedConfirm = async () => {
    if (!blockedReason.trim()) {
      message.warning('请输入阻塞原因');
      return;
    }

    setLoading(true);
    try {
      await tasksApi.updateTaskStatus(task.id, {
        status: 'blocked',
        blocked_reason: blockedReason.trim(),
      });
      message.success('状态更新成功');
      setBlockedModalOpen(false);
      setBlockedReason('');
      onStatusUpdated();
    } catch {
      message.error('状态更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (validTargets.length === 0) {
    return null;
  }

  return (
    <>
      <Space size="small" wrap>
        {validTargets.map((targetStatus) => {
          const config = STATUS_BUTTON_CONFIG[targetStatus];
          return (
            <Button
              key={targetStatus}
              size="small"
              type={targetStatus === 'done' ? 'primary' : 'default'}
              danger={targetStatus === 'blocked'}
              loading={loading}
              onClick={() => handleTransition(targetStatus)}
            >
              {config.label}
            </Button>
          );
        })}
      </Space>

      <Modal
        title="标记为阻塞"
        open={blockedModalOpen}
        onOk={handleBlockedConfirm}
        onCancel={() => setBlockedModalOpen(false)}
        confirmLoading={loading}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <p>请输入阻塞原因：</p>
        <Input.TextArea
          value={blockedReason}
          onChange={(e) => setBlockedReason(e.target.value)}
          placeholder="描述阻塞原因..."
          rows={3}
          aria-label="阻塞原因"
        />
      </Modal>
    </>
  );
}
