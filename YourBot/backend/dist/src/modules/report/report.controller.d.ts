import { ReportService } from './report.service';
import type { JwtPayload } from '../auth/interfaces';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
export declare class ReportController {
    private readonly reportService;
    constructor(reportService: ReportService);
    generate(dto: GenerateReportDto, user: JwtPayload): Promise<{
        job_id: string;
    }>;
    findAll(query: ReportQueryDto): Promise<import("../../common").PaginatedList<{
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        content: string | null;
        reportType: string;
        dateFrom: Date;
        dateTo: Date;
        summary: string | null;
        riskSummary: string | null;
        aiGenerated: boolean;
    }>>;
    findOne(id: number): Promise<{
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        content: string | null;
        reportType: string;
        dateFrom: Date;
        dateTo: Date;
        summary: string | null;
        riskSummary: string | null;
        aiGenerated: boolean;
    }>;
    update(id: number, dto: UpdateReportDto): Promise<{
        id: bigint;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        content: string | null;
        reportType: string;
        dateFrom: Date;
        dateTo: Date;
        summary: string | null;
        riskSummary: string | null;
        aiGenerated: boolean;
    }>;
}
