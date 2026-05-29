import { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Spin,
  Alert,
} from 'antd';
import type { UserData } from '@/api/users';
import type { MemberProfileData } from '@/api/users';
import apiClient from '@/api/client';
import type { ApiResponse } from '@/api/client';

const { Text } = Typography;
const { TextArea } = Input;

/**
 * Skill level options.
 */
const SKILL_LEVEL_OPTIONS = [
  { label: '初级 (1)', value: 1 },
  { label: '中级 (2)', value: 2 },
  { label: '高级 (3)', value: 3 },
  { label: '专家 (4)', value: 4 },
  { label: '大师 (5)', value: 5 },
];

interface MemberProfileEditorProps {
  open: boolean;
  user: UserData | null;
  onClose: () => void;
}

/**
 * Drawer for managing member profile: skills, workload, availability.
 * Only applicable for users with role 'member'.
 */
export default function MemberProfileEditor({
  open,
  user,
  onClose,
}: MemberProfileEditorProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<MemberProfileData | null>(null);

  /**
   * Fetch member profile when drawer opens.
   */
  useEffect(() => {
    if (open && user) {
      fetchProfile(user.id);
    }
  }, [open, user]);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiResponse<MemberProfileData | null>>(
        `/users/${userId}/profile`,
      );
      const data = response.data.data;
      setProfile(data);
      if (data) {
        form.setFieldsValue({
          skillTags: data.skillTags ?? [],
          skillLevel: data.skillLevel,
          preferredTaskTypes: data.preferredTaskTypes ?? [],
          avoidTaskTypes: data.avoidTaskTypes ?? [],
          currentWorkload: data.currentWorkload,
          availableHoursPerWeek: data.availableHoursPerWeek,
          remark: data.remark ?? '',
        });
      } else {
        form.resetFields();
      }
    } catch {
      setError('获取成员档案失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save member profile.
   */
  const handleFinish = async (values: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        skillTags: values.skillTags as string[],
        skillLevel: values.skillLevel as number | undefined,
        preferredTaskTypes: values.preferredTaskTypes as string[],
        avoidTaskTypes: values.avoidTaskTypes as string[],
        currentWorkload: values.currentWorkload as number | undefined,
        availableHoursPerWeek: values.availableHoursPerWeek as number | undefined,
        remark: (values.remark as string) || undefined,
      };

      if (profile) {
        await apiClient.put(`/users/${user.id}/profile`, payload);
      } else {
        await apiClient.post(`/users/${user.id}/profile`, payload);
      }
      onClose();
    } catch {
      setError('保存成员档案失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={`成员档案 - ${user?.name ?? ''}`}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
            disabled={loading}
          >
            保存
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            <Button size="small" onClick={() => user && fetchProfile(user.id)}>
              重试
            </Button>
          }
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          autoComplete="off"
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            管理成员的技能标签、工作负载和可用性信息，用于 AI 任务分配建议。
          </Text>

          <Divider>技能信息</Divider>

          <Form.Item
            name="skillTags"
            label="技能标签"
            extra="输入技能后按回车添加"
          >
            <Select
              mode="tags"
              placeholder="例如：React, TypeScript, Node.js"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="skillLevel"
            label="技能等级"
          >
            <Select
              placeholder="请选择技能等级"
              allowClear
              options={SKILL_LEVEL_OPTIONS}
            />
          </Form.Item>

          <Form.Item
            name="preferredTaskTypes"
            label="偏好任务类型"
            extra="输入任务类型后按回车添加"
          >
            <Select
              mode="tags"
              placeholder="例如：前端开发, API设计, 测试"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="avoidTaskTypes"
            label="回避任务类型"
            extra="输入任务类型后按回车添加"
          >
            <Select
              mode="tags"
              placeholder="例如：文档编写, 运维"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Divider>工作负载</Divider>

          <Form.Item
            name="currentWorkload"
            label="当前工作量（小时/周）"
          >
            <InputNumber
              min={0}
              max={168}
              precision={1}
              placeholder="当前每周工作小时数"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="availableHoursPerWeek"
            label="每周可用小时数"
          >
            <InputNumber
              min={0}
              max={168}
              precision={1}
              placeholder="每周可分配的工作小时数"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Divider>备注</Divider>

          <Form.Item
            name="remark"
            label="备注"
          >
            <TextArea
              rows={3}
              placeholder="关于该成员的其他备注信息"
            />
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
