/**
 * Unified API error codes per Requirement 11.2
 */
export const ErrorCodes = {
  SUCCESS: 0,
  VALIDATION_ERROR: 40001,
  UNAUTHORIZED: 40101,
  FORBIDDEN: 40301,
  NOT_FOUND: 40401,
  SERVER_ERROR: 50001,
  AI_ERROR: 50002,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
