import { PrismaService } from '../../infra/prisma';
import { AiJobType } from '../../domain/enums';
import { CreateAiJobDto } from './dto';
import { AiJobHandler } from './interfaces';
export declare class AiJobService {
    private readonly prisma;
    private readonly logger;
    private readonly handlers;
    constructor(prisma: PrismaService);
    registerHandler(jobType: AiJobType, handler: AiJobHandler): void;
    createJob(dto: CreateAiJobDto): Promise<string>;
    dispatchJob(jobId: string): void;
    createAndDispatch(dto: CreateAiJobDto): Promise<string>;
    getJob(jobId: string): Promise<{
        id: string;
        jobType: string;
        status: string;
        requestId: string;
        bizRefId: string | null;
        inputPayload: import("@prisma/client/runtime/client").JsonValue;
        outputPayload: import("@prisma/client/runtime/client").JsonValue;
        rawResponse: string | null;
        promptVersion: string;
        schemaVersion: string;
        retryCount: number;
        maxRetry: number;
        errorMessage: string | null;
        createdBy: string;
        createdAt: string;
        startedAt: string | null;
        completedAt: string | null;
    }>;
    cancelJob(jobId: string): Promise<void>;
    private processJob;
}
