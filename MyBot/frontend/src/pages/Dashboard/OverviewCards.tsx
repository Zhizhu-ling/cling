import { Card, Col, Row, Statistic } from 'antd';
import {
  FileTextOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { OverviewCardsData } from '@/api/dashboard';

interface OverviewCardsProps {
  data: OverviewCardsData | null;
  loading: boolean;
}

/**
 * Overview cards - clickable to navigate to related pages.
 */
export default function OverviewCards({ data, loading }: OverviewCardsProps) {
  const navigate = useNavigate();

  const cards = [
    {
      title: '需求总数',
      value: data?.requirements_count ?? 0,
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
      color: '#e6f7ff',
      onClick: () => navigate('/requirements'),
    },
    {
      title: '进行中任务',
      value: data?.active_tasks_count ?? 0,
      icon: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
      color: '#f6ffed',
      onClick: () => navigate('/tasks/board'),
    },
    {
      title: '已完成任务',
      value: data?.completed_tasks_count ?? 0,
      icon: <CheckCircleOutlined style={{ color: '#722ed1' }} />,
      color: '#f9f0ff',
      onClick: () => navigate('/tasks/board'),
    },
    {
      title: '逾期任务',
      value: data?.overdue_tasks_count ?? 0,
      icon: <ClockCircleOutlined style={{ color: '#ff4d4f' }} />,
      color: '#fff2f0',
      onClick: () => navigate('/tasks/board'),
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={24} sm={12} lg={6} key={card.title}>
          <Card
            loading={loading}
            style={{ backgroundColor: card.color, cursor: 'pointer' }}
            hoverable
            onClick={card.onClick}
          >
            <Statistic
              title={card.title}
              value={card.value}
              prefix={card.icon}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
