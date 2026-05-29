import { useState, useEffect, useCallback } from 'react';
import { Button, App, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usersApi } from '@/api/users';
import type {
  UserData,
  UserQuery,
  UserRole,
  UserStatus,
  CreateUserParams,
  UpdateUserParams,
} from '@/api/users';
import UserTable from './UserTable';
import UserFormDrawer from './UserFormDrawer';
import MemberProfileEditor from './MemberProfileEditor';

const { Title } = Typography;

/**
 * Admin Users management page.
 * Provides listing, filtering, creation, editing, and deactivation of users.
 * Also supports managing member profiles (skills, workload, availability).
 */
export default function AdminUsersPage() {
  const { message, modal } = App.useApp();

  // Data state
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });

  // Filter state
  const [filters, setFilters] = useState<UserQuery>({
    page: 1,
    page_size: 20,
  });

  // User form drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Member profile editor state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserData | null>(null);

  /**
   * Fetch users from the API.
   */
  const fetchUsers = useCallback(async (query: UserQuery) => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.getUsers(query);
      const data = response.data.data;
      setUsers(data.list);
      setPagination(data.pagination);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '获取用户列表失败';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(filters);
  }, [filters, fetchUsers]);

  /**
   * Handle filter changes.
   */
  const handleFilterChange = (newFilters: { role?: UserRole; status?: UserStatus }) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  };

  /**
   * Handle pagination change.
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      page_size: pageSize,
    }));
  };

  /**
   * Open drawer for creating a new user.
   */
  const handleCreate = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  /**
   * Open drawer for editing an existing user.
   */
  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setDrawerOpen(true);
  };

  /**
   * Handle deactivation with confirmation.
   */
  const handleDeactivate = (user: UserData) => {
    modal.confirm({
      title: '确认禁用用户',
      content: `确定要禁用用户 "${user.name}" (${user.username}) 吗？禁用后该用户将无法登录系统。`,
      okText: '确认禁用',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await usersApi.deactivateUser(user.id);
          message.success('用户已禁用');
          fetchUsers(filters);
        } catch {
          message.error('禁用用户失败');
        }
      },
    });
  };

  /**
   * Handle user deletion.
   */
  const handleDeleteUser = async (user: UserData) => {
    try {
      await usersApi.deleteUser(user.id);
      message.success('用户已删除');
      fetchUsers(filters);
    } catch (err: any) {
      const msg = err?.response?.data?.message || '删除用户失败';
      message.error(msg);
    }
  };

  /**
   * Handle form submission (create or update).
   */
  const handleSubmit = async (values: CreateUserParams | UpdateUserParams) => {
    setSubmitting(true);
    try {
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, values as UpdateUserParams);
        message.success('用户更新成功');
      } else {
        await usersApi.createUser(values as CreateUserParams);
        message.success('用户创建成功');
      }
      setDrawerOpen(false);
      setEditingUser(null);
      fetchUsers(filters);
    } catch {
      message.error(editingUser ? '用户更新失败' : '用户创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Open member profile editor.
   */
  const handleEditProfile = (user: UserData) => {
    setProfileUser(user);
    setProfileOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建用户
        </Button>
      </div>

      <UserTable
        dataSource={users}
        loading={loading}
        error={error}
        pagination={pagination}
        filters={{ role: filters.role, status: filters.status }}
        onPageChange={handlePageChange}
        onFilterChange={handleFilterChange}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onDelete={handleDeleteUser}
        onEditProfile={handleEditProfile}
        onRetry={() => fetchUsers(filters)}
      />

      <UserFormDrawer
        open={drawerOpen}
        user={editingUser}
        submitting={submitting}
        onClose={() => {
          setDrawerOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSubmit}
      />

      <MemberProfileEditor
        open={profileOpen}
        user={profileUser}
        onClose={() => {
          setProfileOpen(false);
          setProfileUser(null);
        }}
      />
    </div>
  );
}
