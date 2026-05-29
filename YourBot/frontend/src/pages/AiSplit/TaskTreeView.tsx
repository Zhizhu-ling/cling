import { Tree, Tag, Typography, Space, Empty } from 'antd';
import {
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { AiGeneratedTask } from '@/api/requirements';

const { Text } = Typography;

/**
 * Convert the AI-generated task tree into Ant Design Tree data nodes.
 */
function buildTreeData(
  tasks: AiGeneratedTask[],
  parentKey = '',
): TreeDataNode[] {
  return tasks.map((task, index) => {
    const key = parentKey ? `${parentKey}-${index}` : `${index}`;
    const node: TreeDataNode = {
      key,
      title: (
        <Space size="small">
          <Text strong>{task.title}</Text>
          <Tag icon={<ClockCircleOutlined />} color="blue">
            {task.estimatedHours}h
          </Tag>
          {task.dependencies.length > 0 && (
            <Tag color="orange">
              依赖: {task.dependencies.length}
            </Tag>
          )}
        </Space>
      ),
      children:
        task.children && task.children.length > 0
          ? buildTreeData(task.children, key)
          : undefined,
    };
    return node;
  });
}

/**
 * Tree data node type for Ant Design Tree.
 */
interface TreeDataNode {
  key: string;
  title: React.ReactNode;
  children?: TreeDataNode[];
}

interface TaskTreeViewProps {
  tasks: AiGeneratedTask[];
  onSelectTask: (taskPath: string) => void;
}

/**
 * Displays the AI-generated task tree in a hierarchical tree view.
 * Allows selecting a task node to open the edit drawer.
 *
 * Validates: Requirements 3.2, 3.4
 */
export default function TaskTreeView({ tasks, onSelectTask }: TaskTreeViewProps) {
  if (!tasks || tasks.length === 0) {
    return <Empty description="暂无任务数据" />;
  }

  const treeData = buildTreeData(tasks);

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <FileTextOutlined />
        <Text strong>AI 生成的任务树</Text>
        <Text type="secondary">（点击任务可编辑）</Text>
        <EditOutlined style={{ color: '#1890ff' }} />
      </Space>
      <Tree
        treeData={treeData}
        defaultExpandAll
        showLine={{ showLeafIcon: false }}
        onSelect={(selectedKeys) => {
          if (selectedKeys.length > 0) {
            onSelectTask(selectedKeys[0] as string);
          }
        }}
      />
    </div>
  );
}
