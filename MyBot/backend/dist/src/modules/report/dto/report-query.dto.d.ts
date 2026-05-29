import { ReportType } from '../../../domain/enums';
export declare class ReportQueryDto {
    page?: number;
    page_size?: number;
    report_type?: ReportType;
    date_from?: string;
    date_to?: string;
}
