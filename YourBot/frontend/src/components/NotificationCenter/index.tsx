import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Dropdown, Empty, List, Space, Spin, Typography } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { notificationsApi } from '@/api/notifications';
import type { Notification } from '@/api/notifications';
import { useRealtimeEvents } from '@/hooks';

const { Text } = Typography;

/**
 * NotificationCenter component - Bell icon with unread count badge and dropdown list.
 *
 * Features:
 * - Bell icon with unread count badge
 * - Dropdown with notification list
 * - Click notification to mark as read
 * - "Mark all as read" button
 * - Auto-refresh on 'notification.created' WebSocket event
 *
 * Validates: Requirements 5.2
 */
export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getNotifications({ page: 1, page_size: 20 });
      const data = response.data.data;
      setNotifications(data.list);
      setUnreadCount(data.list.filter((n) => !n.isRead).length);
    } catch {
      // Silently fail - notification center is non-critical UI
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh on 'notification.created' WebSocket event
  useRealtimeEvents('notification.created', () => {
    fetchNotifications();
  });

  const handleMarkAsRead = useCallback(
    async (id: number) => {
      try {
        await notificationsApi.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    },
    [],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 7) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const dropdownContent = (
    <div
      style={{
        width: 360,
        maxHeight: 420,
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>通知</Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAllAsRead();
            }}
          >
            全部已读
          </Button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无通知"
          style={{ padding: '24px 0' }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              style={{
                padding: '12px 16px',
                cursor: item.isRead ? 'default' : 'pointer',
                background: item.isRead ? 'transparent' : '#f6ffed',
                borderBottom: '1px solid #f0f0f0',
              }}
              onClick={() => {
                if (!item.isRead) {
                  handleMarkAsRead(item.id);
                }
              }}
            >
              <List.Item.Meta
                title={
                  <Space size={4}>
                    {!item.isRead && (
                      <Badge status="processing" />
                    )}
                    <Text
                      style={{
                        fontWeight: item.isRead ? 'normal' : 500,
                        fontSize: 13,
                      }}
                    >
                      {item.title}
                    </Text>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {item.content && (
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {item.content}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={(visible) => {
        setOpen(visible);
        if (visible) {
          fetchNotifications();
        }
      }}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label={`通知${unreadCount > 0 ? ` (${unreadCount}条未读)` : ''}`}
        />
      </Badge>
    </Dropdown>
  );
}
