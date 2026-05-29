import { ConfigService } from '@nestjs/config';
export declare class AiClient {
    private readonly configService;
    private readonly logger;
    private readonly endpoint;
    private readonly apiKey;
    private readonly modelName;
    private readonly timeoutMs;
    constructor(configService: ConfigService);
    chat(prompt: string, systemPrompt?: string): Promise<string>;
}
