import { TaskStateMachine, TaskTransitionContext } from './task.state-machine';
import { TaskStatus } from '../enums/task-status.enum';

describe('TaskStateMachine', () => {
  let sm: TaskStateMachine;

  beforeEach(() => {
    sm = new TaskStateMachine();
  });

  describe('canTransition', () => {
    describe('allowed transitions', () => {
      const allowedCases: [TaskStatus, TaskStatus][] = [
        [TaskStatus.TODO, TaskStatus.DOING],
        [TaskStatus.DOING, TaskStatus.BLOCKED],
        [TaskStatus.DOING, TaskStatus.DELAYED],
        [TaskStatus.DOING, TaskStatus.DONE],
        [TaskStatus.BLOCKED, TaskStatus.DOING],
        [TaskStatus.DELAYED, TaskStatus.DOING],
      ];

      it.each(allowedCases)(
        'should allow %s → %s',
        (from, to) => {
          expect(sm.canTransition(from, to)).toBe(true);
        },
      );
    });

    describe('forbidden transitions', () => {
      const forbiddenCases: [TaskStatus, TaskStatus][] = [
        [TaskStatus.DONE, TaskStatus.DOING],
        [TaskStatus.DONE, TaskStatus.BLOCKED],
        [TaskStatus.DONE, TaskStatus.TODO],
        [TaskStatus.DONE, TaskStatus.DELAYED],
        [TaskStatus.BLOCKED, TaskStatus.DONE],
        [TaskStatus.TODO, TaskStatus.DONE],
        [TaskStatus.TODO, TaskStatus.BLOCKED],
        [TaskStatus.TODO, TaskStatus.DELAYED],
        [TaskStatus.DELAYED, TaskStatus.DONE],
        [TaskStatus.DELAYED, TaskStatus.BLOCKED],
        [TaskStatus.BLOCKED, TaskStatus.DELAYED],
      ];

      it.each(forbiddenCases)(
        'should forbid %s → %s',
        (from, to) => {
          expect(sm.canTransition(from, to)).toBe(false);
        },
      );
    });

    describe('same-state transitions', () => {
      const allStatuses = Object.values(TaskStatus);

      it.each(allStatuses)(
        'should forbid %s → %s (same state)',
        (status) => {
          expect(sm.canTransition(status, status)).toBe(false);
        },
      );
    });

    describe('admin force-close', () => {
      it('should allow todo → done for admin', () => {
        expect(sm.canTransition(TaskStatus.TODO, TaskStatus.DONE, true)).toBe(true);
      });

      it('should forbid todo → done for non-admin', () => {
        expect(sm.canTransition(TaskStatus.TODO, TaskStatus.DONE, false)).toBe(false);
      });

      it('should still forbid done → doing for admin', () => {
        expect(sm.canTransition(TaskStatus.DONE, TaskStatus.DOING, true)).toBe(false);
      });
    });
  });

  describe('validateTransition', () => {
    describe('transition not allowed', () => {
      it('should return invalid for forbidden transition', () => {
        const result = sm.validateTransition(TaskStatus.DONE, TaskStatus.DOING);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });

    describe('blocked requires blocked_reason', () => {
      it('should reject transition to blocked without reason', () => {
        const result = sm.validateTransition(TaskStatus.DOING, TaskStatus.BLOCKED);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked_reason');
      });

      it('should reject transition to blocked with empty reason', () => {
        const result = sm.validateTransition(TaskStatus.DOING, TaskStatus.BLOCKED, {
          blockedReason: '   ',
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('blocked_reason');
      });

      it('should accept transition to blocked with valid reason', () => {
        const result = sm.validateTransition(TaskStatus.DOING, TaskStatus.BLOCKED, {
          blockedReason: 'Waiting for API access',
        });
        expect(result.valid).toBe(true);
      });
    });

    describe('done sets completed_at and progress=100', () => {
      it('should return side effects with completedAt and progress=100', () => {
        const result = sm.validateTransition(TaskStatus.DOING, TaskStatus.DONE);
        expect(result.valid).toBe(true);
        expect(result.sideEffects).toBeDefined();
        expect(result.sideEffects!.completedAt).toBeInstanceOf(Date);
        expect(result.sideEffects!.progress).toBe(100);
      });

      it('should return side effects for admin force-close todo → done', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DONE, {
          isAdmin: true,
        });
        expect(result.valid).toBe(true);
        expect(result.sideEffects).toBeDefined();
        expect(result.sideEffects!.progress).toBe(100);
        expect(result.sideEffects!.completedAt).toBeInstanceOf(Date);
      });
    });

    describe('progress validation', () => {
      it('should reject progress below 0', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING, {
          progress: -1,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Progress');
      });

      it('should reject progress above 100', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING, {
          progress: 101,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Progress');
      });

      it('should accept progress at 0', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING, {
          progress: 0,
        });
        expect(result.valid).toBe(true);
      });

      it('should accept progress at 100', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING, {
          progress: 100,
        });
        expect(result.valid).toBe(true);
      });

      it('should accept progress at 50', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING, {
          progress: 50,
        });
        expect(result.valid).toBe(true);
      });

      it('should accept when progress is not provided', () => {
        const result = sm.validateTransition(TaskStatus.TODO, TaskStatus.DOING);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getValidTransitions', () => {
    it('should return [doing] for todo (non-admin)', () => {
      expect(sm.getValidTransitions(TaskStatus.TODO)).toEqual([TaskStatus.DOING]);
    });

    it('should return [doing, done] for todo (admin)', () => {
      const transitions = sm.getValidTransitions(TaskStatus.TODO, true);
      expect(transitions).toContain(TaskStatus.DOING);
      expect(transitions).toContain(TaskStatus.DONE);
      expect(transitions).toHaveLength(2);
    });

    it('should return [blocked, delayed, done] for doing', () => {
      const transitions = sm.getValidTransitions(TaskStatus.DOING);
      expect(transitions).toContain(TaskStatus.BLOCKED);
      expect(transitions).toContain(TaskStatus.DELAYED);
      expect(transitions).toContain(TaskStatus.DONE);
      expect(transitions).toHaveLength(3);
    });

    it('should return [doing] for blocked', () => {
      expect(sm.getValidTransitions(TaskStatus.BLOCKED)).toEqual([TaskStatus.DOING]);
    });

    it('should return [doing] for delayed', () => {
      expect(sm.getValidTransitions(TaskStatus.DELAYED)).toEqual([TaskStatus.DOING]);
    });

    it('should return [] for done', () => {
      expect(sm.getValidTransitions(TaskStatus.DONE)).toEqual([]);
    });

    it('should return [] for done even with admin', () => {
      expect(sm.getValidTransitions(TaskStatus.DONE, true)).toEqual([]);
    });
  });
});
