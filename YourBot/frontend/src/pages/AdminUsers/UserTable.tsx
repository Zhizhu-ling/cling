import { Table, Tag, Space, Button, Select, Alert, Popconfirm } from 'antd';
import { EditOutlined, StopOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { UserData, UserRole, UserStatus } from '@/api/users';

/**
 * Role display configuration.
 */
const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: { label: '管理员', color: 'red' },
  manager: { label: '经理', color: 'blue' },
  member: { label: '成员', color: 'green' },
};

/**
 * Status display configuration.
 */
const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active: { label: '活跃', color: 'success' },
  disabled: { label: '已禁用', color: 'default' },
};

interface UserTableProps {
  dataSource: UserData[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; page_size: number; total: number };
  filters: { role?: UserRole; status?: UserStatus };
  onPageChange: (page: number, pageSize: number) => void;
  onFilterChange: (filters: { role?: UserRole; status?: UserStatus }) => void;
  onEdit: (user: UserData) => void;
  onDeactivate: (user: UserData) => void;
  onDelete: (user: UserData) => void;
  onEditProfile?: (user: UserData) => void;
  onRetry: () => void;
}

/**
 * User table with pagination, role/status filters, and action buttons.
 */
export default function UserTable({
  dataSource,
  loading,
  error,
  pagination,
  filters,
  onPageChange,
  onFilterChange,
  onEdit,
  onDeactivate,
  onDelete,
  onEditProfile,
  onRetry,
}: UserTableProps) {
  const columns: ColumnsType<UserData> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: UserRole) => (
        <Tag color={ROLE_CONFIG[role]?.color}>{ROLE_CONFIG[role]?.label ?? role}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UserStatus) => (
        <Tag color={STATUS_CONFIG[status]?.color}>{STATUS_CONFIG[status]?.label ?? status}</Tag>
      ),
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone: string | null) => phone ?? '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          {record.role === 'member' && onEditProfile && (
            <Button
              type="link"
              size="small"
              icon={<UserOutlined />}
              onClick={() => onEditProfile(record)}
            >
              档案
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => onDeactivate(record)}
            >
              禁用
            </Button>
          )}
          {record.role !== 'admin' && (
            <Popconfirm
              title="确认删除"
              description={`确定要删除用户"${record.name}"吗？此操作不可恢复。`}
              onConfirm={() => onDelete(record)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        type="error"
        message="加载失败"
        description={error}
        showIcon
        action={
          <Button size="small" onClick={onRetry}>
            重试
          </Button>
        }
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="角色筛选"
          allowClear
          style={{ width: 140 }}
          value={filters.role}
          onChange={(value) => onFilterChange({ ...filters, role: value })}
          options={[
            { label: '管理员', value: 'admin' },
            { label: '经理', value: 'manager' },
            { label: '成员', value: 'member' },
          ]}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          value={filters.status}
          onChange={(value) => onFilterChange({ ...filters, status: value })}
          options={[
            { label: '活跃', value: 'active' },
            { label: '已禁用', value: 'disabled' },
          ]}
        />
      </Space>

      <Table<UserData>
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.page_size,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
      />
    </div>
  );
}
