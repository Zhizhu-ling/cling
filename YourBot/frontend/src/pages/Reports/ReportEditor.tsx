import { useState, useEffect } from 'react';
import { Drawer, Form, Input, Button, Space, App } from 'antd';
import type { Report, UpdateReportDto } from '@/api/reports';

const { TextArea } = Input;

interface ReportEditorProps {
  open: boolean;
  report: Report | null;
  onClose: () => void;
  onSave: (id: number, dto: UpdateReportDto) => Promise<void>;
}

/**
 * Report editor drawer for editing generated reports.
 * Allows editing title, summary, content, and risk summary.
 */
export default function ReportEditor({ open, report, onClose, onSave }: ReportEditorProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (report && open) {
      form.setFieldsValue({
        title: report.title,
        summary: report.summary ?? '',
        content: report.content ?? '',
        risk_summary: report.riskSummary ?? '',
      });
    }
  }, [report, open, form]);

  const handleSubmit = async () => {
    if (!report) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onSave(report.id, values);
      message.success('报告保存成功');
      onClose();
    } catch {
      message.error('报告保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="编辑报告"
      open={open}
      onClose={onClose}
      width={640}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入报告标题' }]}
        >
          <Input placeholder="报告标题" />
        </Form.Item>
        <Form.Item name="summary" label="摘要">
          <TextArea rows={3} placeholder="报告摘要" />
        </Form.Item>
        <Form.Item name="content" label="内容">
          <TextArea rows={10} placeholder="报告详细内容（支持 Markdown）" />
        </Form.Item>
        <Form.Item name="risk_summary" label="风险摘要">
          <TextArea rows={3} placeholder="风险摘要" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
