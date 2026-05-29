import { TaskStatus } from '../enums/task-status.enum';

/**
 * Context for validating a task status transition.
 */
export interface TaskTransitionContext {
  isAdmin?: boolean;
  blockedReason?: string;
  progress?: number;
}

/**
 * Result of a transition validation.
 */
export interface TaskTransitionResult {
  valid: boolean;
  error?: string;
  /** Side effects to apply when the transition is valid */
  sideEffects?: {
    completedAt?: Date;
    progress?: number;
  };
}

/**
 * Allowed transitions map: from status → list of allowed target statuses.
 * Note: todo→done is conditionally allowed for admin force-close only.
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.DOING],
  [TaskStatus.DOING]: [TaskStatus.BLOCKED, TaskStatus.DELAYED, TaskStatus.DONE],
  [TaskStatus.BLOCKED]: [TaskStatus.DOING],
  [TaskStatus.DELAYED]: [TaskStatus.DOING],
  [TaskStatus.DONE]: [],
};

/**
 * Admin-only transitions that are not in the standard allowed map.
 */
const ADMIN_ONLY_TRANSITIONS: Array<{ from: TaskStatus; to: TaskStatus }> = [
  { from: TaskStatus.TODO, to: TaskStatus.DONE },
];

/**
 * Task state machine enforcing status transition rules.
 *
 * Allowed transitions:
 *   todo → doing
 *   doing → blocked, delayed, done
 *   blocked → doing
 *   delayed → doing
 *
 * Admin force-close:
 *   todo → done (admin only)
 *
 * Forbidden transitions (always):
 *   done → any
 *   blocked → done
 *   todo → done (non-admin)
 */
export class TaskStateMachine {
  /**
   * Check if a transition is allowed.
   * @param from Current status
   * @param to Target status
   * @param isAdmin Whether the user has admin privileges
   * @returns true if the transition is permitted
   */
  canTransition(from: TaskStatus, to: TaskStatus, isAdmin = false): boolean {
    if (from === to) {
      return false;
    }

    // Check standard allowed transitions
    const allowed = ALLOWED_TRANSITIONS[from];
    if (allowed && allowed.includes(to)) {
      return true;
    }

    // Check admin-only transitions
    if (isAdmin) {
      return ADMIN_ONLY_TRANSITIONS.some(
        (t) => t.from === from && t.to === to,
      );
    }

    return false;
  }

  /**
   * Validate a transition with full context, including business rule enforcement.
   * @param from Current status
   * @param to Target status
   * @param context Optional context with admin flag, blocked reason, and progress
   * @returns Validation result with optional side effects
   */
  validateTransition(
    from: TaskStatus,
    to: TaskStatus,
    context?: TaskTransitionContext,
  ): TaskTransitionResult {
    const isAdmin = context?.isAdmin ?? false;

    // Check if transition is allowed
    if (!this.canTransition(from, to, isAdmin)) {
      return {
        valid: false,
        error: `Transition from "${from}" to "${to}" is not allowed`,
      };
    }

    // Validate: blocked requires blocked_reason
    if (to === TaskStatus.BLOCKED) {
      if (!context?.blockedReason || context.blockedReason.trim() === '') {
        return {
          valid: false,
          error: 'Transition to "blocked" requires a blocked_reason',
        };
      }
    }

    // Validate: progress must be in [0, 100] if provided
    if (context?.progress !== undefined && context.progress !== null) {
      if (context.progress < 0 || context.progress > 100) {
        return {
          valid: false,
          error: 'Progress must be between 0 and 100 inclusive',
        };
      }
    }

    // Side effects for done: set completed_at and progress=100
    if (to === TaskStatus.DONE) {
      return {
        valid: true,
        sideEffects: {
          completedAt: new Date(),
          progress: 100,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Get all valid target statuses from a given status.
   * @param from Current status
   * @param isAdmin Whether the user has admin privileges
   * @returns Array of valid target statuses
   */
  getValidTransitions(from: TaskStatus, isAdmin = false): TaskStatus[] {
    const transitions = [...(ALLOWED_TRANSITIONS[from] || [])];

    if (isAdmin) {
      for (const t of ADMIN_ONLY_TRANSITIONS) {
        if (t.from === from && !transitions.includes(t.to)) {
          transitions.push(t.to);
        }
      }
    }

    return transitions;
  }
}
