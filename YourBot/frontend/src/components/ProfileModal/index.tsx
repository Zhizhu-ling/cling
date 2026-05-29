import { useState } from 'react';
import { Modal, Form, Input, Tabs, App } from 'antd';
import { apiClient } from '@/api';
import { useAuthStore } from '@/store/authStore';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 个人设置弹窗 - 修改用户名/姓名/密码
 */
export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { message } = App.useApp();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setSaving(true);
      await apiClient.put('/users/me/profile', values);
      message.success('个人信息修改成功');
      await fetchMe(); // 刷新用户信息
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || '修改失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      setSaving(true);
      // 只发送后端需要的字段，去掉 confirm_password
      const { old_password, new_password } = values;
      await apiClient.put('/users/me/password', { old_password, new_password });
      message.success('密码修改成功');
      passwordForm.resetFields();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.data?.message || '修改失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const items = [
    {
      key: 'profile',
      label: '个人信息',
      children: (
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{ name: user?.name, username: user?.username }}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" maxLength={64} />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名（登录账号）"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" maxLength={64} />
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'password',
      label: '修改密码',
      children: (
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="old_password"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      ),
    },
  ];

  const [activeTab, setActiveTab] = useState('profile');

  return (
    <Modal
      title="个人设置"
      open={open}
      onCancel={onClose}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      onOk={() => {
        if (activeTab === 'profile') {
          handleSaveProfile();
        } else {
          handleChangePassword();
        }
      }}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
      />
    </Modal>
  );
}
