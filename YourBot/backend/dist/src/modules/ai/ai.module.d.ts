import { OnModuleInit } from '@nestjs/common';
import { AiJobService } from './ai-job.service';
import { AiClient } from './ai-client';
export declare class AiModule implements OnModuleInit {
    private readonly aiJobService;
    private readonly aiClient;
    constructor(aiJobService: AiJobService, aiClient: AiClient);
    onModuleInit(): void;
}
