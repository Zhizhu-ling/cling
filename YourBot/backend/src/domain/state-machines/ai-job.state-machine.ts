import { AiJobStatus } from '../enums';

/**
 * Allowed transitions map for AI Job state machine.
 * Key: source state, Value: array of valid target states.
 */
const AI_JOB_TRANSITIONS: ReadonlyMap<AiJobStatus, readonly AiJobStatus[]> =
  new Map([
    [AiJobStatus.PENDING, [AiJobStatus.RUNNING, AiJobStatus.CANCELED]],
    [AiJobStatus.RUNNING, [AiJobStatus.SUCCESS, AiJobStatus.FAIL]],
    [AiJobStatus.SUCCESS, []],
    [AiJobStatus.FAIL, []],
    [AiJobStatus.CANCELED, []],
  ]);

/**
 * Explicitly forbidden transitions with clear error messages.
 */
const FORBIDDEN_TRANSITIONS: ReadonlyMap<string, string> = new Map([
  [
    `${AiJobStatus.SUCCESS}->${AiJobStatus.RUNNING}`,
    'Cannot restart a completed AI job. A successful job is final.',
  ],
  [
    `${AiJobStatus.FAIL}->${AiJobStatus.SUCCESS}`,
    'Cannot mark a failed AI job as successful. Submit a new job instead.',
  ],
  [
    `${AiJobStatus.CANCELED}->${AiJobStatus.RUNNING}`,
    'Cannot run a canceled AI job. Submit a new job instead.',
  ],
]);

export class AiJobStateMachine {
  /**
   * Check whether a transition from one state to another is allowed.
   */
  static canTransition(from: AiJobStatus, to: AiJobStatus): boolean {
    const allowed = AI_JOB_TRANSITIONS.get(from);
    if (!allowed) {
      return false;
    }
    return allowed.includes(to);
  }

  /**
   * Validate a transition and return a result object with an optional error message.
   */
  static validateTransition(
    from: AiJobStatus,
    to: AiJobStatus,
  ): { valid: boolean; error?: string } {
    // Check explicitly forbidden transitions first for clear error messages
    const key = `${from}->${to}`;
    const forbiddenMessage = FORBIDDEN_TRANSITIONS.get(key);
    if (forbiddenMessage) {
      return { valid: false, error: forbiddenMessage };
    }

    // Check if transition is in the allowed set
    if (this.canTransition(from, to)) {
      return { valid: true };
    }

    // Generic rejection for any other invalid transition
    return {
      valid: false,
      error: `Transition from '${from}' to '${to}' is not allowed.`,
    };
  }

  /**
   * Get all valid target states from a given state.
   */
  static getValidTransitions(from: AiJobStatus): readonly AiJobStatus[] {
    return AI_JOB_TRANSITIONS.get(from) ?? [];
  }
}
