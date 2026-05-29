import { AiService } from './ai.service';
import { AiJobService } from './ai-job.service';
import { AiClient } from './ai-client';
export declare class AiController {
    private readonly aiService;
    private readonly aiJobService;
    private readonly aiClient;
    constructor(aiService: AiService, aiJobService: AiJobService, aiClient: AiClient);
    getStatus(): Promise<{
        available: boolean;
        model: string;
        error?: undefined;
    } | {
        available: boolean;
        model: string;
        error: any;
    }>;
    getJob(id: string): Promise<{
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
    cancelJob(id: string): Promise<{
        id: string;
        status: string;
    }>;
}
