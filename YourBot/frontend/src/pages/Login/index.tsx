import { useState } from 'react';
import { Form, Input, Button, Card, Typography, App, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { LoginParams } from '@/api/auth';

const { Title } = Typography;

/**
 * Get the default redirect path based on user role.
 */
function getDefaultRoute(role: string): string {
  switch (role) {
    case 'admin':
      return '/admin/users';
    case 'manager':
      return '/dashboard';
    case 'member':
      return '/tasks/my';
    default:
      return '/';
  }
}

/**
 * Login page with Ant Design form.
 * Handles user authentication and redirects based on role.
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values: LoginParams) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(values);
      const user = useAuthStore.getState().user;
      const redirectPath = getDefaultRoute(user?.role ?? '');
      message.success('登录成功');
      navigate(redirectPath, { replace: true });
    } catch {
      setErrorMsg('用户名或密码错误，请重新输入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            MyBot
          </Title>
          <Typography.Text type="secondary">
            智能团队任务协同助手
          </Typography.Text>
        </div>

        <Form<LoginParams>
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              closable
              onClose={() => setErrorMsg(null)}
            />
          )}
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              aria-label="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              aria-label="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
