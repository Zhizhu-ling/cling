import { AiJobHandler, AiJobHandlerResult } from '../ai/interfaces';
import { AiClient } from '../ai/ai-client';
import { ReportService } from './report.service';
export declare class ReportJobHandler implements AiJobHandler {
    private readonly reportService;
    private readonly logger;
    private readonly innerHandler;
    constructor(reportService: ReportService, aiClient?: AiClient);
    execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}
