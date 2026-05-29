import { AiJobType } from '../../../domain/enums';
export interface CreateAiJobDto {
    jobType: AiJobType;
    bizRefId?: bigint;
    inputPayload: Record<string, any>;
    createdBy: bigint;
    requestId: string;
    maxRetry?: number;
    templateName?: string;
}
