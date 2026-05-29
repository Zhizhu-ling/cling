import { Select, DatePicker, Space } from 'antd';
import type { ReportType, ReportQuery } from '@/api/reports';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface ReportFilterBarProps {
  filters: ReportQuery;
  onChange: (filters: Partial<ReportQuery>) => void;
}

const REPORT_TYPE_OPTIONS: { label: string; value: ReportType }[] = [
  { label: '日报', value: 'daily' },
  { label: '周报', value: 'weekly' },
  { label: '阶段报告', value: 'stage' },
];

/**
 * Filter bar for the Reports page.
 * Allows filtering by report type and date range.
 */
export default function ReportFilterBar({ filters, onChange }: ReportFilterBarProps) {
  const handleTypeChange = (value: ReportType | undefined) => {
    onChange({ report_type: value, page: 1 });
  };

  const handleDateRangeChange = (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
  ) => {
    if (dates && dates[0] && dates[1]) {
      onChange({
        date_from: dates[0].format('YYYY-MM-DD'),
        date_to: dates[1].format('YYYY-MM-DD'),
        page: 1,
      });
    } else {
      onChange({ date_from: undefined, date_to: undefined, page: 1 });
    }
  };

  return (
    <Space wrap style={{ marginBottom: 16 }}>
      <Select
        placeholder="报告类型"
        allowClear
        style={{ width: 140 }}
        value={filters.report_type}
        onChange={handleTypeChange}
        options={REPORT_TYPE_OPTIONS}
      />
      <RangePicker
        value={
          filters.date_from && filters.date_to
            ? [dayjs(filters.date_from), dayjs(filters.date_to)]
            : null
        }
        onChange={handleDateRangeChange}
      />
    </Space>
  );
}
