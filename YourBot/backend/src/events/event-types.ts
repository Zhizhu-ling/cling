/**
 * Domain event type constants used by the outbox pattern and event bus.
 */
export const EventTypes = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_BLOCKED: 'task.blocked',
  TASK_DONE: 'task.done',

  // Requirement events
  REQUIREMENT_CREATED: 'requirement.created',
  REQUIREMENT_SPLIT_DONE: 'requirement.split_done',

  // AI Job events
  AI_JOB_CREATED: 'ai_job.created',
  AI_JOB_RUNNING: 'ai_job.running',
  AI_JOB_SUCCESS: 'ai_job.success',
  AI_JOB_FAIL: 'ai_job.fail',

  // Report events
  REPORT_GENERATED: 'report.generated',

  // Alert events
  ALERT_CREATED: 'alert.created',
  ALERT_RESOLVED: 'alert.resolved',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
