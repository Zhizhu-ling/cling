import { useCallback, useEffect, useState } from 'react';
import { Typography, Space, Col, Row, App } from 'antd';
import { dashboardApi } from '@/api/dashboard';
import type { DashboardData } from '@/api/dashboard';
import { useRealtimeEvents } from '@/hooks';
import OverviewCards from './OverviewCards';
import TaskStatusChart from './TaskStatusChart';
import MemberLoadList from './MemberLoadList';
import AlertList from './AlertList';

const { Title } = Typography;

/**
 * Dashboard page - displays key metrics, task status distribution,
 * member workload, and active alerts.
 * Auto-refreshes when an alert.created WebSocket event is received.
 *
 * Route: /dashboard
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export default function DashboardPage() {
  const { message } = App.useApp();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardApi.getDashboard();
      setData(response.data.data);
    } catch {
      message.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh on alert.created WebSocket event
  useRealtimeEvents('alert.created', () => {
    fetchDashboard();
  });

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>仪表盘</Title>

        <OverviewCards data={data?.overview_cards ?? null} loading={loading} />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <TaskStatusChart
              data={data?.task_status_distribution ?? null}
              loading={loading}
            />
          </Col>
          <Col xs={24} lg={12}>
            <MemberLoadList
              data={data?.member_workload ?? null}
              loading={loading}
            />
          </Col>
        </Row>

        <AlertList data={data?.active_alerts ?? null} loading={loading} />
      </Space>
    </div>
  );
}
