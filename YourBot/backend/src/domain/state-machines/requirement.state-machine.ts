import { RequirementStatus } from '../enums';

/**
 * Transition validation result
 */
export interface TransitionResult {
  valid: boolean;
  error?: string;
}

/**
 * Requirement state machine enforcing lifecycle transitions.
 *
 * Allowed transitions:
 *   draft → analyzing
 *   analyzing → split_done
 *   split_done → assigned
 *   assigned → in_progress
 *   in_progress → closed
 *
 * Forbidden transitions (explicitly rejected with clear error messages):
 *   closed → in_progress
 *   split_done → draft
 *   assigned → split_done
 *   closed → assigned
 */
export class RequirementStateMachine {
  /**
   * Map of allowed transitions: from status → array of valid target statuses
   */
  private static readonly ALLOWED_TRANSITIONS: ReadonlyMap<
    RequirementStatus,
    ReadonlyArray<RequirementStatus>
  > = new Map([
    [RequirementStatus.DRAFT, [RequirementStatus.ANALYZING]],
    [RequirementStatus.ANALYZING, [RequirementStatus.SPLIT_DONE]],
    [RequirementStatus.SPLIT_DONE, [RequirementStatus.ASSIGNED]],
    [RequirementStatus.ASSIGNED, [RequirementStatus.IN_PROGRESS]],
    [RequirementStatus.IN_PROGRESS, [RequirementStatus.CLOSED]],
    [RequirementStatus.CLOSED, []],
  ]);

  /**
   * Explicitly forbidden transitions with descriptive error messages
   */
  private static readonly FORBIDDEN_TRANSITIONS: ReadonlyMap<
    string,
    string
  > = new Map([
    [
      `${RequirementStatus.CLOSED}->${RequirementStatus.IN_PROGRESS}`,
      'Cannot reopen a closed requirement. Closed requirements are final.',
    ],
    [
      `${RequirementStatus.SPLIT_DONE}->${RequirementStatus.DRAFT}`,
      'Cannot revert a split requirement back to draft. The task tree has already been generated.',
    ],
    [
      `${RequirementStatus.ASSIGNED}->${RequirementStatus.SPLIT_DONE}`,
      'Cannot revert an assigned requirement back to split_done. Tasks have already been assigned.',
    ],
    [
      `${RequirementStatus.CLOSED}->${RequirementStatus.ASSIGNED}`,
      'Cannot reassign a closed requirement. Closed requirements are final.',
    ],
  ]);

  /**
   * Check if a transition from one status to another is allowed.
   */
  static canTransition(
    from: RequirementStatus,
    to: RequirementStatus,
  ): boolean {
    const allowed = this.ALLOWED_TRANSITIONS.get(from);
    if (!allowed) {
      return false;
    }
    return allowed.includes(to);
  }

  /**
   * Validate a transition and return a result with an error message if invalid.
   */
  static validateTransition(
    from: RequirementStatus,
    to: RequirementStatus,
  ): TransitionResult {
    // Check for same-state transition
    if (from === to) {
      return {
        valid: false,
        error: `Requirement is already in '${from}' status. No transition needed.`,
      };
    }

    // Check explicitly forbidden transitions first for clear error messages
    const transitionKey = `${from}->${to}`;
    const forbiddenMessage = this.FORBIDDEN_TRANSITIONS.get(transitionKey);
    if (forbiddenMessage) {
      return { valid: false, error: forbiddenMessage };
    }

    // Check if transition is in the allowed set
    if (this.canTransition(from, to)) {
      return { valid: true };
    }

    // Generic invalid transition message
    return {
      valid: false,
      error: `Invalid transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${(this.ALLOWED_TRANSITIONS.get(from) || []).join(', ')}].`,
    };
  }

  /**
   * Get all valid next statuses from the given status.
   */
  static getValidTransitions(from: RequirementStatus): RequirementStatus[] {
    return [...(this.ALLOWED_TRANSITIONS.get(from) || [])];
  }
}
