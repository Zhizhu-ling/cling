import { useEffect, useState, useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Spin, Button, Space, Typography, Tag, Menu, Dropdown } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  TeamOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api';
import ProfileModal from '@/components/ProfileModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'red' },
  manager: { label: '经理', color: 'blue' },
  member: { label: '成员', color: 'green' },
};

/**
 * Menu items configuration per role.
 */
function getMenuItems(role: string): MenuProps['items'] {
  const managerItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/requirements', icon: <FileTextOutlined />, label: '需求管理' },
    { key: '/tasks/board', icon: <AppstoreOutlined />, label: '任务看板' },
    { key: '/tasks/assignment', icon: <ProjectOutlined />, label: '任务分配' },
    { key: '/tasks/my', icon: <ProjectOutlined />, label: '我的任务' },
    { key: '/reports', icon: <BarChartOutlined />, label: '报告管理' },
  ];

  const adminItems: MenuProps['items'] = [
    ...managerItems,
    { type: 'divider' },
    { key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' },
    { key: '/admin/audit-logs', icon: <AuditOutlined />, label: '操作日志' },
  ];

  const memberItems: MenuProps['items'] = [
    { key: '/tasks/my', icon: <ProjectOutlined />, label: '我的任务' },
  ];

  switch (role) {
    case 'admin':
      return adminItems;
    case 'manager':
      return managerItems;
    case 'member':
      return memberItems;
    default:
      return [];
  }
}

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin', '/dashboard', '/requirements', '/tasks', '/reports'],
  manager: ['/dashboard', '/requirements', '/tasks', '/reports'],
  member: ['/tasks/my', '/tasks/'],
};

function hasRouteAccess(role: string, pathname: string): boolean {
  const allowedPrefixes = ROLE_ROUTES[role];
  if (!allowedPrefixes) return false;
  if (role === 'admin') return true;
  if (role === 'member') {
    if (pathname === '/tasks/my') return true;
    if (/^\/tasks\/\d+$/.test(pathname)) return true;
    return false;
  }
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

interface AuthGuardProps {
  children: React.ReactNode;
  roles?: string[];
}

export default function AuthGuard({ children, roles }: AuthGuardProps) {
  const { isAuthenticated, user, loading, fetchMe, token, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [aiStatus, setAiStatus] = useState<{ available: boolean; model: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (token && !user && !loading) {
      fetchMe();
    }
  }, [token, user, loading, fetchMe]);

  // 检测 AI 状态
  const checkAiStatus = useCallback(async () => {
    try {
      const response = await apiClient.get('/ai/status');
      setAiStatus(response.data.data);
    } catch {
      setAiStatus({ available: false, model: 'unknown' });
    }
  }, []);

  useEffect(() => {
    if (token && user) {
      checkAiStatus();
    }
  }, [token, user, checkAiStatus]);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!hasRouteAccess(user.role, location.pathname)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  const userDropdownItems: MenuProps['items'] = [
    { key: 'settings', icon: <SettingOutlined />, label: '个人设置' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'settings') {
      setProfileOpen(true);
    } else if (e.key === 'logout') {
      handleLogout();
    }
  };

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'default' };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Text strong style={{ fontSize: 18 }}>MyBot</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems(user.role)}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
        {/* AI 状态提示 */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          {aiStatus && (
            <div style={{ fontSize: 12, color: aiStatus.available ? '#52c41a' : '#ff4d4f', display: 'flex', alignItems: 'center', gap: 4 }}>
              {aiStatus.available ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              <span>AI {aiStatus.available ? '已连接' : '未连接'}</span>
              <span style={{ color: '#999', marginLeft: 4 }}>({aiStatus.model})</span>
            </div>
          )}
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            height: 48,
          }}
        >
          <Space size="middle">
            <Dropdown menu={{ items: userDropdownItems, onClick: handleUserMenuClick }} trigger={['click']}>
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserOutlined />
                <span>{user.name}</span>
                <Tag color={roleInfo.color} style={{ marginLeft: 4 }}>{roleInfo.label}</Tag>
              </Button>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 0, background: '#f5f5f5' }}>
          {children}
        </Content>
      </Layout>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </Layout>
  );
}
