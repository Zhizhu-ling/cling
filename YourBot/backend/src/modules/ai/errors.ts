/**
 * Custom error classes for AI module error classification.
 * Used by the retry strategy to determine retry behavior.
 */

/**
 * Base class for all AI-related errors.
 * Preserves the raw response from the AI model when available.
 */
export class AiError extends Error {
  public readonly rawResponse?: string;

  constructor(message: string, rawResponse?: string) {
    super(message);
    this.name = 'AiError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Thrown when a network-level failure occurs (connection refused, DNS failure, etc.).
 * Retry policy: up to 2 retries with exponential backoff.
 */
export class NetworkError extends AiError {
  constructor(message: string, rawResponse?: string) {
    super(message, rawResponse);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown when the AI response cannot be parsed as valid JSON
 * or fails Zod schema validation.
 * Retry policy: up to 1 retry.
 */
export class ParseError extends AiError {
  constructor(message: string, rawResponse?: string) {
    super(message, rawResponse);
    this.name = 'ParseError';
  }
}

/**
 * Thrown when the AI model call times out.
 * Retry policy: up to 1 retry.
 */
export class TimeoutError extends AiError {
  constructor(message: string, rawResponse?: string) {
    super(message, rawResponse);
    this.name = 'TimeoutError';
  }
}

/**
 * Thrown when the AI output fails business-level validation
 * (e.g., missing required business fields, invalid references).
 * Retry policy: no retry, immediate failure with raw_response preserved.
 */
export class BusinessValidationError extends AiError {
  constructor(message: string, rawResponse?: string) {
    super(message, rawResponse);
    this.name = 'BusinessValidationError';
  }
}
