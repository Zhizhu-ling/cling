import { ReportType } from '../../../domain/enums';
export declare class GenerateReportDto {
    report_type: ReportType;
    date_from: string;
    date_to: string;
    project_id?: string;
}
