export interface AiJobHandler {
    execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}
export interface AiJobHandlerResult {
    outputPayload: Record<string, any>;
    rawResponse?: string;
}
