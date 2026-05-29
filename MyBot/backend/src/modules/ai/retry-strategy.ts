import {
  AiError,
  NetworkError,
  ParseError,
  TimeoutError,
  BusinessValidationError,
} from './errors';

/**
 * Configuration for retry behavior per error type.
 */
export interface RetryConfig {
  /** Maximum retries for network errors (default: 2) */
  networkMaxRetries: number;
  /** Maximum retries for parse errors (default: 1) */
  parseMaxRetries: number;
  /** Maximum retries for timeout errors (default: 1) */
  timeoutMaxRetries: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay cap in ms (default: 10000) */
  maxDelayMs: number;
}

/**
 * Result of a retry execution, including metadata about the attempt.
 */
export interface RetryResult<T> {
  /** The successful result value */
  result: T;
  /** Total number of attempts made (1 = no retries) */
  attempts: number;
}

/**
 * Error thrown when all retries are exhausted.
 * Preserves the last error and raw response.
 */
export class RetryExhaustedError extends AiError {
  public readonly lastError: AiError;
  public readonly totalAttempts: number;

  constructor(lastError: AiError, totalAttempts: number) {
    super(
      `All retries exhausted after ${totalAttempts} attempt(s): ${lastError.message}`,
      lastError.rawResponse,
    );
    this.name = 'RetryExhaustedError';
    this.lastError = lastError;
    this.totalAttempts = totalAttempts;
  }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  networkMaxRetries: 2,
  parseMaxRetries: 1,
  timeoutMaxRetries: 1,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Determines the maximum number of retries allowed for a given error type.
 */
export function getMaxRetriesForError(
  error: Error,
  config: RetryConfig,
): number {
  if (error instanceof BusinessValidationError) {
    return 0; // No retry for business validation failures
  }
  if (error instanceof NetworkError) {
    return config.networkMaxRetries;
  }
  if (error instanceof ParseError) {
    return config.parseMaxRetries;
  }
  if (error instanceof TimeoutError) {
    return config.timeoutMaxRetries;
  }
  // Unknown errors: no retry
  return 0;
}

/**
 * Calculates the delay before the next retry using exponential backoff with jitter.
 * @param attempt - The current retry attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.baseDelayMs * 0.5;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * A sleep utility that can be overridden in tests.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry logic based on error classification.
 *
 * Retry behavior per error type:
 * - NetworkError: up to 2 retries with exponential backoff
 * - ParseError: up to 1 retry
 * - TimeoutError: up to 1 retry
 * - BusinessValidationError: no retry, immediate failure with raw_response preserved
 *
 * @param fn - The async function to execute (and potentially retry)
 * @param config - Optional retry configuration overrides
 * @param delayFn - Optional delay function (for testing)
 * @returns RetryResult with the successful result and attempt count
 * @throws RetryExhaustedError when all retries are exhausted
 * @throws BusinessValidationError immediately without retry
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  delayFn: (ms: number) => Promise<void> = sleep,
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let attempts = 0;
  let lastError: AiError | undefined;

  // We need at least 1 attempt. Max attempts = 1 + max possible retries.
  // Since we don't know the error type upfront, we loop and check per-error.
  const absoluteMaxAttempts =
    1 +
    Math.max(
      fullConfig.networkMaxRetries,
      fullConfig.parseMaxRetries,
      fullConfig.timeoutMaxRetries,
    );

  while (attempts < absoluteMaxAttempts) {
    attempts++;
    try {
      const result = await fn();
      return { result, attempts };
    } catch (error) {
      // Ensure we're dealing with an AiError
      if (!(error instanceof AiError)) {
        // Unknown error type: wrap and fail immediately
        throw error;
      }

      lastError = error;

      // BusinessValidationError: never retry
      if (error instanceof BusinessValidationError) {
        throw error;
      }

      // Check if we have retries remaining for this error type
      const maxRetries = getMaxRetriesForError(error, fullConfig);
      const retriesMade = attempts - 1; // attempts includes the initial try

      if (retriesMade >= maxRetries) {
        // No more retries for this error type
        throw new RetryExhaustedError(error, attempts);
      }

      // Apply backoff delay before retrying
      const delay = calculateBackoffDelay(retriesMade, fullConfig);
      await delayFn(delay);
    }
  }

  // Should not reach here, but safety net
  throw new RetryExhaustedError(
    lastError ?? new AiError('Unknown error'),
    attempts,
  );
}
