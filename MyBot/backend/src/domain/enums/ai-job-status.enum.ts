/**
 * AI Job status values
 */
export enum AiJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAIL = 'fail',
  CANCELED = 'canceled',
}

/**
 * AI Job type values
 */
export enum AiJobType {
  REQUIREMENT_SPLIT = 'requirement_split',
  ASSIGNMENT_SUGGEST = 'assignment_suggest',
  REPORT_GENERATE = 'report_generate',
}
