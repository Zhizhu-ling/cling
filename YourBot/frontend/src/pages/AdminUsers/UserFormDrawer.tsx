import { useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, Space } from 'antd';
import type { UserData, CreateUserParams, UpdateUserParams } from '@/api/users';

/**
 * Role options for the form select.
 */
const ROLE_OPTIONS = [
  { label: '管理员', value: 'admin' },
  { label: '经理', value: 'manager' },
  { label: '成员', value: 'member' },
];

interface UserFormDrawerProps {
  open: boolean;
  user: UserData | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateUserParams | UpdateUserParams) => void;
}

/**
 * Drawer form for creating or editing a user.
 * Create mode requires username, password, name, role, email.
 * Edit mode allows updating name, role, phone, avatar.
 */
export default function UserFormDrawer({
  open,
  user,
  submitting,
  onClose,
  onSubmit,
}: UserFormDrawerProps) {
  const [form] = Form.useForm();
  const isEditing = !!user;

  // Reset form when drawer opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          name: user.name,
          role: user.role,
          phone: user.phone ?? '',
          avatar: user.avatar ?? '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, user, form]);

  /**
   * Handle form submission.
   */
  const handleFinish = (values: Record<string, unknown>) => {
    if (isEditing) {
      const params: UpdateUserParams = {
        name: values.name as string,
        role: values.role as UpdateUserParams['role'],
        phone: (values.phone as string) || undefined,
        avatar: (values.avatar as string) || undefined,
      };
      onSubmit(params);
    } else {
      const params: CreateUserParams = {
        username: values.username as string,
        password: values.password as string,
        name: values.name as string,
        role: values.role as CreateUserParams['role'],
        email: values.email as string,
        phone: (values.phone as string) || undefined,
        avatar: (values.avatar as string) || undefined,
      };
      onSubmit(params);
    }
  };

  return (
    <Drawer
      title={isEditing ? '编辑用户' : '新建用户'}
      open={open}
      onClose={onClose}
      width={480}
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
        {!isEditing && (
          <>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { max: 64, message: '用户名不能超过64个字符' },
              ]}
            >
              <Input placeholder="请输入用户名" maxLength={64} />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="请输入密码（至少6位）" />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
                { max: 128, message: '邮箱不能超过128个字符' },
              ]}
            >
              <Input placeholder="请输入邮箱" maxLength={128} />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="name"
          label="姓名"
          rules={[
            { required: true, message: '请输入姓名' },
            { max: 64, message: '姓名不能超过64个字符' },
          ]}
        >
          <Input placeholder="请输入姓名" maxLength={64} />
        </Form.Item>

        <Form.Item
          name="role"
          label="角色"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色" options={ROLE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="phone"
          label="手机号"
        >
          <Input placeholder="请输入手机号（可选）" maxLength={32} />
        </Form.Item>

        <Form.Item
          name="avatar"
          label="头像URL"
        >
          <Input placeholder="请输入头像URL（可选）" maxLength={255} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
