import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Report } from '@/api/reports';
import dayjs from 'dayjs';

const { Link } = Typography;

interface ReportListProps {
  dataSource: Report[];
  loading: boolean;
  pagination: { page: number; page_size: number; total: number };
  onPageChange: (page: number, pageSize: number) => void;
  onSelect: (report: Report) => void;
}

const REPORT_TYPE_LABELS: Record<string, { text: string; color: string }> = {
  daily: { text: '日报', color: 'blue' },
  weekly: { text: '周报', color: 'green' },
  stage: { text: '阶段报告', color: 'purple' },
};

/**
 * Report list table with pagination.
 * Displays reports with type, title, date range, and creation info.
 */
export default function ReportList({
  dataSource,
  loading,
  pagination,
  onPageChange,
  onSelect,
}: ReportListProps) {
  const columns: ColumnsType<Report> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Report) => (
        <Link onClick={() => onSelect(record)}>{text}</Link>
      ),
    },
    {
      title: '类型',
      dataIndex: 'reportType',
      key: 'reportType',
      width: 120,
      render: (type: string) => {
        const info = REPORT_TYPE_LABELS[type] || { text: type, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '日期范围',
      key: 'dateRange',
      width: 220,
      render: (_: unknown, record: Report) => (
        <span>
          {dayjs(record.dateFrom).format('YYYY-MM-DD')} ~ {dayjs(record.dateTo).format('YYYY-MM-DD')}
        </span>
      ),
    },
    {
      title: 'AI 生成',
      dataIndex: 'aiGenerated',
      key: 'aiGenerated',
      width: 100,
      render: (val: boolean) => (val ? <Tag color="geekblue">AI</Tag> : <Tag>手动</Tag>),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <Table<Report>
      rowKey="id"
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      pagination={{
        current: pagination.page,
        pageSize: pagination.page_size,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange,
      }}
    />
  );
}
