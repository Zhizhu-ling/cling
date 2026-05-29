import { useEffect, useState, useCallback } from 'react';
import { List, Input, Button, Avatar, Typography, Space, App, Spin } from 'antd';
import { UserOutlined, SendOutlined } from '@ant-design/icons';
import { apiClient } from '@/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CommentAuthor {
  id: number;
  name: string;
  avatar?: string | null;
}

interface TaskCommentData {
  id: number;
  taskId: number;
  content: string;
  authorId: number;
  createdAt: string;
  author: CommentAuthor;
}

interface TaskCommentsProps {
  taskId: string | number;
}

/**
 * 任务评论组件 - 显示评论列表并支持添加新评论。
 */
export default function TaskComments({ taskId }: TaskCommentsProps) {
  const { message } = App.useApp();
  const [comments, setComments] = useState<TaskCommentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tasks/${taskId}/comments`);
      setComments(response.data.data);
    } catch {
      message.error('加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [taskId, message]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning('请输入评论内容');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/tasks/${taskId}/comments`, { content: content.trim() });
      setContent('');
      message.success('评论已添加');
      await fetchComments();
    } catch {
      message.error('添加评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 24, background: '#fff', padding: 24, borderRadius: 8 }}>
      <Text strong style={{ fontSize: 16, marginBottom: 16, display: 'block' }}>
        评论 ({comments.length})
      </Text>

      {/* 评论输入区 */}
      <div style={{ marginBottom: 24 }}>
        <TextArea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="输入评论内容..."
          maxLength={5000}
          disabled={submitting}
        />
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={!content.trim()}
          >
            发送
          </Button>
        </div>
      </div>

      {/* 评论列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <List
          dataSource={comments}
          locale={{ emptyText: '暂无评论' }}
          renderItem={(item) => (
            <List.Item style={{ alignItems: 'flex-start' }}>
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={item.author.avatar}
                    icon={!item.author.avatar ? <UserOutlined /> : undefined}
                  />
                }
                title={
                  <Space>
                    <Text strong>{item.author.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </Space>
                }
                description={
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {item.content}
                  </Paragraph>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
