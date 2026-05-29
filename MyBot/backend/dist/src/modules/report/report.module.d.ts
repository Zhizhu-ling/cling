import { OnModuleInit } from '@nestjs/common';
import { ReportService } from './report.service';
import { AiJobService } from '../ai/ai-job.service';
import { AiClient } from '../ai/ai-client';
export declare class ReportModule implements OnModuleInit {
    private readonly aiJobService;
    private readonly reportService;
    private readonly aiClient;
    constructor(aiJobService: AiJobService, reportService: ReportService, aiClient: AiClient);
    onModuleInit(): void;
}
