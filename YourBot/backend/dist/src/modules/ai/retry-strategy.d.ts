import { AiError } from './errors';
export interface RetryConfig {
    networkMaxRetries: number;
    parseMaxRetries: number;
    timeoutMaxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
export interface RetryResult<T> {
    result: T;
    attempts: number;
}
export declare class RetryExhaustedError extends AiError {
    readonly lastError: AiError;
    readonly totalAttempts: number;
    constructor(lastError: AiError, totalAttempts: number);
}
export declare function getMaxRetriesForError(error: Error, config: RetryConfig): number;
export declare function calculateBackoffDelay(attempt: number, config: RetryConfig): number;
export declare function sleep(ms: number): Promise<void>;
export declare function executeWithRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>, delayFn?: (ms: number) => Promise<void>): Promise<RetryResult<T>>;
