/**
 * Interface for AI job handlers.
 * Each job type should have a handler that implements this interface.
 */
export interface AiJobHandler {
  /**
   * Execute the AI job with the given input payload.
   * @returns The structured output payload on success.
   * @throws Error on failure (message will be stored as errorMessage).
   */
  execute(inputPayload: Record<string, any>): Promise<AiJobHandlerResult>;
}

/**
 * Result from an AI job handler execution.
 */
export interface AiJobHandlerResult {
  /** Parsed structured output */
  outputPayload: Record<string, any>;

  /** Raw response text from the AI model */
  rawResponse?: string;
}
