import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import { AiClient } from '../ai-client';
export interface AssignmentSuggestInput {
    tasks: Array<{
        task_key: string;
        title: string;
        description?: string;
        estimated_hours?: number;
        required_skills?: string[];
        priority?: number;
    }>;
    members: Array<{
        member_id: string;
        name: string;
        skills: string[];
        workload: number;
        availability: number;
        historical_success_rate: number;
    }>;
    biz_ref_id?: string;
}
export declare function buildAssignmentSuggestPrompt(input: AssignmentSuggestInput): string;
export declare class AssignmentSuggestHandler implements AiJobHandler {
    private readonly aiClient?;
    private readonly logger;
    constructor(aiClient?: AiClient | undefined);
    execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}
