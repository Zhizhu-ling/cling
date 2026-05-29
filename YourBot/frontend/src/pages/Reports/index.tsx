import { useState, useEffect, useCallback } from 'react';
import { Button, App, Typography, Modal, Form, Select, DatePicker, Spin } from 'antd';
import { FileAddOutlined } from '@ant-design/icons';
import { reportsApi } from '@/api/reports';
import type { Report, ReportQuery, ReportType, UpdateReportDto, GenerateReportDto } from '@/api/reports';
import { useAiJobPolling } from '@/hooks/useAiJobPolling';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import ReportFilterBar from './ReportFilterBar';
import ReportList from './ReportList';
import ReportEditor from './ReportEditor';
import ReportPreview from './ReportPreview';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const REPORT_TYPE_OPTIONS: { label: string; value: ReportType }[] = [
  { label: '日报', value: 'daily' },
  { label: '周报', value: 'weekly' },
  { label: '阶段报告', value: 'stage' },
];

/**
 * Reports management page.
 * Provides listing, filtering, AI generation, editing, and Markdown export of reports.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export default function ReportsPage() {
  const { message } = App.useApp();

  // Data state
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });

  // Filter state
  const [filters, setFilters] = useState<ReportQuery>({ page: 1, page_size: 20 });

  // Generate modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  // AI job polling
  const [jobId, setJobId] = useState<string | null>(null);
  const { status: jobStatus, error: jobError, isLoading: jobPolling } = useAiJobPolling(jobId);

  // Preview & Editor state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  /**
   * Fetch reports from the API.
   */
  const fetchReports = useCallback(async (query: ReportQuery) => {
    setLoading(true);
    try {
      const response = await reportsApi.list(query);
      const data = response.data.data;
      setReports(data.list);
      setPagination(data.pagination);
    } catch {
      message.error('获取报告列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchReports(filters);
  }, [filters, fetchReports]);

  /**
   * Auto-refresh on WebSocket 'report.generated' event.
   */
  useRealtimeEvents('report.generated', () => {
    fetchReports(filters);
  });

  /**
   * Handle AI job completion: refresh list and show result.
   */
  useEffect(() => {
    if (jobStatus === 'success') {
      message.success('AI 报告生成成功');
      setJobId(null);
      fetchReports(filters);
    } else if (jobStatus === 'fail') {
      message.error(jobError ?? 'AI 报告生成失败');
      setJobId(null);
    }
  }, [jobStatus, jobError, message, fetchReports, filters]);

  /**
   * Handle filter changes from the filter bar.
   */
  const handleFilterChange = (newFilters: Partial<ReportQuery>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  /**
   * Handle pagination change.
   */
  const handlePageChange = (page: number, pageSize: number) => {
    setFilters((prev) => ({ ...prev, page, page_size: pageSize }));
  };

  /**
   * Open report preview.
   */
  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  };

  /**
   * Open report editor from preview.
   */
  const handleEditFromPreview = (report: Report) => {
    setPreviewOpen(false);
    setSelectedReport(report);
    setEditorOpen(true);
  };

  /**
   * Save edited report.
   */
  const handleSaveReport = async (id: number, dto: UpdateReportDto) => {
    await reportsApi.update(id, dto);
    fetchReports(filters);
  };

  /**
   * Submit AI report generation job.
   */
  const handleGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      setGenerating(true);

      const dto: GenerateReportDto = {
        report_type: values.report_type,
        date_from: values.date_range[0].format('YYYY-MM-DD'),
        date_to: values.date_range[1].format('YYYY-MM-DD'),
      };

      const response = await reportsApi.generate(dto);
      const { job_id } = response.data.data;
      setJobId(job_id);
      setGenerateModalOpen(false);
      generateForm.resetFields();
      message.info('AI 报告生成任务已提交，正在处理中...');
    } catch {
      message.error('提交报告生成任务失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>报告管理</Title>
        <Button
          type="primary"
          icon={<FileAddOutlined />}
          onClick={() => setGenerateModalOpen(true)}
          loading={jobPolling}
        >
          {jobPolling ? 'AI 生成中...' : '生成报告'}
        </Button>
      </div>

      {jobPolling && (
        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Spin tip="AI 正在生成报告，请稍候..." />
        </div>
      )}

      <ReportFilterBar filters={filters} onChange={handleFilterChange} />

      <ReportList
        dataSource={reports}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSelect={handleSelectReport}
      />

      <ReportPreview
        open={previewOpen}
        report={selectedReport}
        onClose={() => setPreviewOpen(false)}
        onEdit={handleEditFromPreview}
      />

      <ReportEditor
        open={editorOpen}
        report={selectedReport}
        onClose={() => {
          setEditorOpen(false);
          setSelectedReport(null);
        }}
        onSave={handleSaveReport}
      />

      {/* Generate Report Modal */}
      <Modal
        title="生成 AI 报告"
        open={generateModalOpen}
        onOk={handleGenerate}
        onCancel={() => {
          setGenerateModalOpen(false);
          generateForm.resetFields();
        }}
        confirmLoading={generating}
        okText="生成"
        cancelText="取消"
      >
        <Form form={generateForm} layout="vertical">
          <Form.Item
            name="report_type"
            label="报告类型"
            rules={[{ required: true, message: '请选择报告类型' }]}
          >
            <Select placeholder="选择报告类型" options={REPORT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="date_range"
            label="日期范围"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
