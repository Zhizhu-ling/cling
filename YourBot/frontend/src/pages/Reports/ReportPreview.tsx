import { Drawer, Button, Space, Typography, Divider, Tag, App } from 'antd';
import { DownloadOutlined, EditOutlined } from '@ant-design/icons';
import type { Report } from '@/api/reports';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

interface ReportPreviewProps {
  open: boolean;
  report: Report | null;
  onClose: () => void;
  onEdit: (report: Report) => void;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: '日报',
  weekly: '周报',
  stage: '阶段报告',
};

/**
 * Generates Markdown content from a report for export.
 */
function generateMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**类型:** ${REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}`);
  lines.push(`**日期范围:** ${dayjs(report.dateFrom).format('YYYY-MM-DD')} ~ ${dayjs(report.dateTo).format('YYYY-MM-DD')}`);
  lines.push(`**生成时间:** ${dayjs(report.createdAt).format('YYYY-MM-DD HH:mm')}`);
  lines.push(`**AI 生成:** ${report.aiGenerated ? '是' : '否'}`);
  lines.push('');

  if (report.summary) {
    lines.push('## 摘要');
    lines.push('');
    lines.push(report.summary);
    lines.push('');
  }

  if (report.content) {
    lines.push('## 详细内容');
    lines.push('');
    lines.push(report.content);
    lines.push('');
  }

  if (report.riskSummary) {
    lines.push('## 风险摘要');
    lines.push('');
    lines.push(report.riskSummary);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Report preview drawer with Markdown export.
 * Displays the report content and allows exporting as .md file.
 */
export default function ReportPreview({ open, report, onClose, onEdit }: ReportPreviewProps) {
  const { message } = App.useApp();

  const handleExport = () => {
    if (!report) return;

    const markdown = generateMarkdown(report);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.title || 'report'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('报告已导出为 Markdown');
  };

  if (!report) return null;

  return (
    <Drawer
      title="报告预览"
      open={open}
      onClose={onClose}
      width={640}
      extra={
        <Space>
          <Button icon={<EditOutlined />} onClick={() => onEdit(report)}>
            编辑
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出 Markdown
          </Button>
        </Space>
      }
    >
      <Typography>
        <Title level={3}>{report.title}</Title>
        <Space style={{ marginBottom: 16 }}>
          <Tag color="blue">{REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}</Tag>
          {report.aiGenerated && <Tag color="geekblue">AI 生成</Tag>}
          <Text type="secondary">
            {dayjs(report.dateFrom).format('YYYY-MM-DD')} ~ {dayjs(report.dateTo).format('YYYY-MM-DD')}
          </Text>
        </Space>

        {report.summary && (
          <>
            <Divider titlePlacement="left">摘要</Divider>
            <Paragraph>{report.summary}</Paragraph>
          </>
        )}

        {report.content && (
          <>
            <Divider titlePlacement="left">详细内容</Divider>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{report.content}</Paragraph>
          </>
        )}

        {report.riskSummary && (
          <>
            <Divider titlePlacement="left">风险摘要</Divider>
            <Paragraph>{report.riskSummary}</Paragraph>
          </>
        )}

        <Divider />
        <Text type="secondary">
          创建时间: {dayjs(report.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          {' | '}
          更新时间: {dayjs(report.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      </Typography>
    </Drawer>
  );
}
