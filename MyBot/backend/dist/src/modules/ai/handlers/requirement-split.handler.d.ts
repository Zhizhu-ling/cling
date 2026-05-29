import { AiJobHandler, AiJobHandlerResult } from '../interfaces';
import { AiClient } from '../ai-client';
export interface RequirementSplitInput {
    requirement_id: string;
    title: string;
    background: string;
    objective: string;
    constraints?: string;
    deliverables: string[] | Record<string, any>[];
}
export declare class RequirementSplitHandler implements AiJobHandler {
    private readonly aiClient?;
    private readonly logger;
    constructor(aiClient?: AiClient | undefined);
    execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}
