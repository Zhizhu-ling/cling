/**
 * Background job type constants
 */
export const JobTypes = {
  AI_REQUIREMENT_SPLIT: 'ai:requirement_split',
  AI_ASSIGNMENT_SUGGEST: 'ai:assignment_suggest',
  AI_REPORT_GENERATE: 'ai:report_generate',
  ALERT_DETECTION: 'alert:detection',
  OUTBOX_DISPATCH: 'outbox:dispatch',
} as const;

export type JobType = (typeof JobTypes)[keyof typeof JobTypes];
