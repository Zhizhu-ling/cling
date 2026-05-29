import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import { AiClient } from '../ai-client';
export interface ReportGenerateInput {
    report_type: 'daily' | 'weekly' | 'stage';
    date_from: string;
    date_to: string;
    project_context?: {
        project_id?: string;
        project_name?: string;
        team_size?: number;
    };
    task_data?: {
        total_tasks?: number;
        completed_tasks?: number;
        blocked_tasks?: number;
        delayed_tasks?: number;
        in_progress_tasks?: number;
    };
    team_data?: {
        members?: Array<{
            name: string;
            completed_count?: number;
            in_progress_count?: number;
        }>;
    };
}
export declare function buildReportPrompt(input: ReportGenerateInput): string;
export declare function generateMockReportResponse(input: ReportGenerateInput): string;
export declare class ReportGenerateHandler implements AiJobHandler {
    private readonly aiClient?;
    private readonly logger;
    constructor(aiClient?: AiClient | undefined);
    execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}
