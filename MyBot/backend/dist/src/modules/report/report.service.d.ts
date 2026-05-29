import { PrismaService } from '../../infra/prisma';
import { PaginatedList } from '../../common/interfaces';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report } from '@prisma/client';
export declare class ReportService {
    private readonly prisma;
    private readonly aiJobService;
    private readonly outboxService;
    constructor(prisma: PrismaService, aiJobService: AiJobService, outboxService: OutboxService);
    generateReport(dto: GenerateReportDto, userId: bigint): Promise<{
        job_id: string;
    }>;
    onReportJobSuccess(jobId: string, outputPayload: Record<string, any>, userId: bigint, inputPayload: Record<string, any>): Promise<void>;
    findAll(query: ReportQueryDto): Promise<PaginatedList<Report>>;
    findOne(id: bigint): Promise<Report>;
    update(id: bigint, dto: UpdateReportDto): Promise<Report>;
}
