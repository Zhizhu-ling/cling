/**
 * Alert type values
 */
export enum AlertType {
  DELAY = 'delay',
  BLOCKED = 'blocked',
  NO_UPDATE = 'no_update',
  OVERLOAD = 'overload',
  MISSING_DEPENDENCY = 'missing_dependency',
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
