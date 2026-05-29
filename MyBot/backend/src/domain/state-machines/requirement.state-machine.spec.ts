import { RequirementStatus } from '../enums';
import { RequirementStateMachine } from './requirement.state-machine';

describe('RequirementStateMachine', () => {
  describe('canTransition', () => {
    const allowedTransitions: [RequirementStatus, RequirementStatus][] = [
      [RequirementStatus.DRAFT, RequirementStatus.ANALYZING],
      [RequirementStatus.ANALYZING, RequirementStatus.SPLIT_DONE],
      [RequirementStatus.SPLIT_DONE, RequirementStatus.ASSIGNED],
      [RequirementStatus.ASSIGNED, RequirementStatus.IN_PROGRESS],
      [RequirementStatus.IN_PROGRESS, RequirementStatus.CLOSED],
    ];

    it.each(allowedTransitions)(
      'should allow transition from %s to %s',
      (from, to) => {
        expect(RequirementStateMachine.canTransition(from, to)).toBe(true);
      },
    );

    const forbiddenTransitions: [RequirementStatus, RequirementStatus][] = [
      [RequirementStatus.CLOSED, RequirementStatus.IN_PROGRESS],
      [RequirementStatus.SPLIT_DONE, RequirementStatus.DRAFT],
      [RequirementStatus.ASSIGNED, RequirementStatus.SPLIT_DONE],
      [RequirementStatus.CLOSED, RequirementStatus.ASSIGNED],
    ];

    it.each(forbiddenTransitions)(
      'should reject forbidden transition from %s to %s',
      (from, to) => {
        expect(RequirementStateMachine.canTransition(from, to)).toBe(false);
      },
    );

    it('should reject transition from closed to any status', () => {
      const allStatuses = Object.values(RequirementStatus);
      for (const to of allStatuses) {
        if (to === RequirementStatus.CLOSED) continue;
        expect(RequirementStateMachine.canTransition(RequirementStatus.CLOSED, to)).toBe(false);
      }
    });

    it('should reject skipping states (e.g., draft→assigned)', () => {
      expect(
        RequirementStateMachine.canTransition(
          RequirementStatus.DRAFT,
          RequirementStatus.ASSIGNED,
        ),
      ).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should return valid for allowed transitions', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.DRAFT,
        RequirementStatus.ANALYZING,
      );
      expect(result).toEqual({ valid: true });
    });

    it('should return error for same-state transition', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.DRAFT,
        RequirementStatus.DRAFT,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already in');
    });

    it('should return specific error for closed→in_progress', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.CLOSED,
        RequirementStatus.IN_PROGRESS,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot reopen a closed requirement');
    });

    it('should return specific error for split_done→draft', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.SPLIT_DONE,
        RequirementStatus.DRAFT,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot revert a split requirement back to draft');
    });

    it('should return specific error for assigned→split_done', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.ASSIGNED,
        RequirementStatus.SPLIT_DONE,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot revert an assigned requirement back to split_done');
    });

    it('should return specific error for closed→assigned', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.CLOSED,
        RequirementStatus.ASSIGNED,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot reassign a closed requirement');
    });

    it('should return generic error for non-forbidden invalid transitions', () => {
      const result = RequirementStateMachine.validateTransition(
        RequirementStatus.DRAFT,
        RequirementStatus.CLOSED,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(result.error).toContain('Allowed transitions');
    });
  });

  describe('getValidTransitions', () => {
    it('should return [analyzing] for draft', () => {
      expect(RequirementStateMachine.getValidTransitions(RequirementStatus.DRAFT)).toEqual([
        RequirementStatus.ANALYZING,
      ]);
    });

    it('should return empty array for closed', () => {
      expect(RequirementStateMachine.getValidTransitions(RequirementStatus.CLOSED)).toEqual([]);
    });

    it('should return [closed] for in_progress', () => {
      expect(RequirementStateMachine.getValidTransitions(RequirementStatus.IN_PROGRESS)).toEqual([
        RequirementStatus.CLOSED,
      ]);
    });
  });
});
