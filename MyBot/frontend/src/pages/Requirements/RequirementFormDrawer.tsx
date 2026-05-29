import { useEffect } from 'react';
import { Drawer, Form, Input, Select, DatePicker, Button, Space } from 'antd';
import dayjs from 'dayjs';
import type { Requirement, CreateRequirementParams, UpdateRequirementParams } from '@/api/requirement';

const { TextArea } = Input;

/**
 * Priority options for the form select.
 */
const PRIORITY_OPTIONS = [
  { label: '紧急 (1)', value: 1 },
  { label: '高 (2)', value: 2 },
  { label: '中 (3)', value: 3 },
  { label: '低 (4)', value: 4 },
];

interface RequirementFormDrawerProps {
  open: boolean;
  requirement: Requirement | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateRequirementParams | UpdateRequirementParams) => void;
}

/**
 * Drawer form for creating or editing a requirement.
 * Includes field validation matching backend constraints.
 */
export default function RequirementFormDrawer({
  open,
  requirement,
  submitting,
  onClose,
  onSubmit,
}: RequirementFormDrawerProps) {
  const [form] = Form.useForm();
  const isEditing = !!requirement;

  // Reset form when drawer opens/closes or requirement changes
  useEffect(() => {
    if (open) {
      if (requirement) {
        form.setFieldsValue({
          title: requirement.title,
          background: requirement.background,
          objective: requirement.objective,
          constraints: requirement.constraints ?? '',
          deliverables: requirement.deliverables?.join('\n') ?? '',
          priority: requirement.priority,
          due_date: requirement.due_date ? dayjs(requirement.due_date) : undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, requirement, form]);

  /**
   * Handle form submission.
   * Transforms deliverables from newline-separated text to array.
   */
  const handleFinish = (values: Record<string, unknown>) => {
    const deliverables = (values.deliverables as string)
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const dueDate = values.due_date as dayjs.Dayjs;

    const params: CreateRequirementParams = {
      title: values.title as string,
      background: values.background as string,
      objective: values.objective as string,
      constraints: (values.constraints as string) || undefined,
      deliverables,
      priority: values.priority as CreateRequirementParams['priority'],
      due_date: dueDate.format('YYYY-MM-DD'),
    };

    onSubmit(params);
  };

  return (
    <Drawer
      title={isEditing ? '编辑需求' : '新建需求'}
      open={open}
      onClose={onClose}
      width={560}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
          >
            {isEditing ? '更新' : '创建'}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入需求标题' }]}
        >
          <Input placeholder="请输入需求标题" maxLength={255} />
        </Form.Item>

        <Form.Item
          name="background"
          label="背景"
          rules={[{ required: true, message: '请输入需求背景' }]}
        >
          <TextArea rows={3} placeholder="请描述需求背景" />
        </Form.Item>

        <Form.Item
          name="objective"
          label="目标"
          rules={[{ required: true, message: '请输入需求目标' }]}
        >
          <TextArea rows={3} placeholder="请描述需求目标" />
        </Form.Item>

        <Form.Item
          name="constraints"
          label="约束条件"
        >
          <TextArea rows={2} placeholder="请描述约束条件（可选）" />
        </Form.Item>

        <Form.Item
          name="deliverables"
          label="交付物"
          rules={[
            { required: true, message: '请输入交付物' },
            {
              validator: (_, value: string) => {
                if (!value) return Promise.resolve();
                const items = value.split('\n').filter((s) => s.trim().length > 0);
                if (items.length === 0) {
                  return Promise.reject(new Error('至少需要一个交付物'));
                }
                return Promise.resolve();
              },
            },
          ]}
          extra="每行一个交付物"
        >
          <TextArea rows={3} placeholder="请输入交付物，每行一个" />
        </Form.Item>

        <Form.Item
          name="priority"
          label="优先级"
          rules={[{ required: true, message: '请选择优先级' }]}
        >
          <Select placeholder="请选择优先级" options={PRIORITY_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="due_date"
          label="截止日期"
          rules={[
            { required: true, message: '请选择截止日期' },
            {
              validator: (_, value: dayjs.Dayjs | undefined) => {
                if (!value) return Promise.resolve();
                if (value.isBefore(dayjs(), 'day')) {
                  return Promise.reject(new Error('截止日期不能早于今天'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            placeholder="请选择截止日期"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
