import { Card, List, Tag, Typography, Progress, Button, Empty } from 'antd';
import { UserOutlined, CheckOutlined } from '@ant-design/icons';
import type { AssignmentSuggestion } from '@/api/tasks';

const { Text, Paragraph } = Typography;

interface MemberRecommendCardProps {
  suggestions: AssignmentSuggestion[];
  /** Currently selected assignments: taskId → memberId */
  selectedAssignments: Map<number, number>;
  onSelectMember: (taskId: number, memberId: number) => void;
}

/**
 * Card component displaying AI-generated assignment suggestions with reasoning.
 * Shows ranked member recommendations for each task.
 *
 * Validates: Requirements 4.1, 4.2
 */
export default function MemberRecommendCard({
  suggestions,
  selectedAssignments,
  onSelectMember,
}: MemberRecommendCardProps) {
  if (suggestions.length === 0) {
    return (
      <Card title="AI 分配建议">
        <Empty description="暂无建议，请选择任务并请求 AI 建议" />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {suggestions.map((suggestion) => {
        const selectedMemberId = selectedAssignments.get(suggestion.taskId);

        return (
          <Card
            key={suggestion.taskId}
            title={
              <Text ellipsis={{ tooltip: suggestion.taskTitle }}>
                {suggestion.taskTitle}
              </Text>
            }
            size="small"
            styles={{ body: { padding: '12px 16px' } }}
          >
            <List
              dataSource={suggestion.recommendations}
              renderItem={(rec, index) => {
                const isSelected = selectedMemberId === rec.memberId;
                return (
                  <List.Item
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: isSelected ? '#e6f4ff' : undefined,
                      border: isSelected
                        ? '1px solid #91caff'
                        : '1px solid transparent',
                    }}
                    actions={[
                      <Button
                        key="select"
                        type={isSelected ? 'primary' : 'default'}
                        size="small"
                        icon={isSelected ? <CheckOutlined /> : undefined}
                        onClick={() =>
                          onSelectMember(suggestion.taskId, rec.memberId)
                        }
                      >
                        {isSelected ? '已选' : '选择'}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Tag
                          color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'default'}
                          icon={<UserOutlined />}
                        >
                          #{index + 1}
                        </Tag>
                      }
                      title={
                        <span>
                          {rec.memberName}
                          <Progress
                            percent={Math.round(rec.confidence * 100)}
                            size="small"
                            style={{ width: 80, marginLeft: 12, display: 'inline-flex' }}
                            format={(p) => `${p}%`}
                          />
                        </span>
                      }
                      description={
                        <Paragraph
                          type="secondary"
                          ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                          style={{ marginBottom: 0 }}
                        >
                          {rec.reason}
                        </Paragraph>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        );
      })}
    </div>
  );
}
