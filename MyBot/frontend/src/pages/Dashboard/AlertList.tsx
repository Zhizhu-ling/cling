import { Card, List, Tag, Typography } from 'antd';
import {
  WarningOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ActiveAlertItem } from '@/api/dashboard';

const { Text } = Typography;

interface AlertListProps {
  data: ActiveAlertItem[] | null;
  loading: boolean;
}

/**
 * Severity color mapping.
 */
const SEVERITY_COLOR: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'gold',
  low: 'blue',
};

/**
 * Alert type icon mapping.
 */
const ALERT_TYPE_ICON: Record<string, React.ReactNode> = {
  delay: <ClockCircleOutlined />,
  blocked: <StopOutlined />,
  overload: <ThunderboltOutlined />,
};

/**
 * Alert type label mapping.
 */
const ALERT_TYPE_LABEL: Record<string, string> = {
  delay: '延期',
  blocked: '阻塞',
  overload: '超载',
  no_update: '无更新',
  missing_dependency: '缺少依赖',
};

/**
 * Active alerts list showing current warnings with severity indicators.
 *
 * Validates: Requirements 9.4, 9.5, 9.6
 */
export default function AlertList({ data, loading }: AlertListProps) {
  return (
    <Card title="活跃告警">
      <List<ActiveAlertItem>
        loading={loading}
        dataSource={data ?? []}
        locale={{ emptyText: '暂无告警' }}
        size="small"
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                ALERT_TYPE_ICON[item.alert_type] ?? <WarningOutlined />
              }
              title={
                <span>
                  {item.title}{' '}
                  <Tag color={SEVERITY_COLOR[item.severity] ?? 'default'}>
                    {item.severity}
                  </Tag>
                  <Tag>
                    {ALERT_TYPE_LABEL[item.alert_type] ?? item.alert_type}
                  </Tag>
                </span>
              }
              description={
                <Text type="secondary" ellipsis>
                  {item.description ?? '无详细描述'}
                </Text>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
