import { Drawer, Form, Input, InputNumber, Button, Space } from 'antd';
import { useEffect } from 'react';
import type { AiGeneratedTask } from '@/api/requirements';

const { TextArea } = Input;

interface TaskEditDrawerProps {
  open: boolean;
  task: AiGeneratedTask | null;
  onClose: () => void;
  onSave: (updatedTask: AiGeneratedTask) => void;
}

/**
 * Drawer for editing a single task in the AI-generated task tree.
 * Allows modifying title, description, estimated hours, and acceptance criteria.
 *
 * Validates: Requirements 3.4
 */
export default function TaskEditDrawer({
  open,
  task,
  onClose,
  onSave,
}: TaskEditDrawerProps) {
  const [form] = Form.useForm<AiGeneratedTask>();

  useEffect(() => {
    if (task && open) {
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        estimatedHours: task.estimatedHours,
        acceptanceCriteria: task.acceptanceCriteria,
      });
    }
  }, [task, open, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (task) {
        onSave({
          ...task,
          title: values.title,
          description: values.description,
          estimatedHours: values.estimatedHours,
          acceptanceCriteria: values.acceptanceCriteria,
        });
      }
      onClose();
    });
  };

  return (
    <Drawer
      title="编辑任务"
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="任务标题"
          rules={[{ required: true, message: '请输入任务标题' }]}
        >
          <Input placeholder="请输入任务标题" />
        </Form.Item>

        <Form.Item
          name="description"
          label="任务描述"
          rules={[{ required: true, message: '请输入任务描述' }]}
        >
          <TextArea rows={4} placeholder="请输入任务描述" />
        </Form.Item>

        <Form.Item
          name="estimatedHours"
          label="预估工时（小时）"
          rules={[{ required: true, message: '请输入预估工时' }]}
        >
          <InputNumber min={0.5} max={200} step={0.5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="acceptanceCriteria"
          label="验收标准"
          rules={[{ required: true, message: '请输入验收标准' }]}
        >
          <TextArea rows={3} placeholder="请输入验收标准" />
        </Form.Item>

        {task?.dependencies && task.dependencies.length > 0 && (
          <Form.Item label="依赖任务">
            <Input
              value={task.dependencies.join(', ')}
              disabled
              style={{ color: '#666' }}
            />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  );
}
