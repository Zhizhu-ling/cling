import { AiJobStateMachine } from './ai-job.state-machine';
import { AiJobStatus } from '../enums';

describe('AiJobStateMachine', () => {
  describe('canTransition', () => {
    it.each([
      [AiJobStatus.PENDING, AiJobStatus.RUNNING],
      [AiJobStatus.PENDING, AiJobStatus.CANCELED],
      [AiJobStatus.RUNNING, AiJobStatus.SUCCESS],
      [AiJobStatus.RUNNING, AiJobStatus.FAIL],
    ])('should allow transition from %s to %s', (from, to) => {
      expect(AiJobStateMachine.canTransition(from, to)).toBe(true);
    });

    it.each([
      [AiJobStatus.SUCCESS, AiJobStatus.RUNNING],
      [AiJobStatus.FAIL, AiJobStatus.SUCCESS],
      [AiJobStatus.CANCELED, AiJobStatus.RUNNING],
    ])('should reject forbidden transition from %s to %s', (from, to) => {
      expect(AiJobStateMachine.canTransition(from, to)).toBe(false);
    });

    it.each([
      [AiJobStatus.SUCCESS, AiJobStatus.PENDING],
      [AiJobStatus.FAIL, AiJobStatus.PENDING],
      [AiJobStatus.CANCELED, AiJobStatus.PENDING],
      [AiJobStatus.RUNNING, AiJobStatus.PENDING],
      [AiJobStatus.PENDING, AiJobStatus.SUCCESS],
      [AiJobStatus.PENDING, AiJobStatus.FAIL],
    ])('should reject other invalid transition from %s to %s', (from, to) => {
      expect(AiJobStateMachine.canTransition(from, to)).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should return valid for allowed transitions', () => {
      const result = AiJobStateMachine.validateTransition(
        AiJobStatus.PENDING,
        AiJobStatus.RUNNING,
      );
      expect(result).toEqual({ valid: true });
    });

    it('should return specific error for success→running', () => {
      const result = AiJobStateMachine.validateTransition(
        AiJobStatus.SUCCESS,
        AiJobStatus.RUNNING,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot restart a completed AI job');
    });

    it('should return specific error for fail→success', () => {
      const result = AiJobStateMachine.validateTransition(
        AiJobStatus.FAIL,
        AiJobStatus.SUCCESS,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain(
        'Cannot mark a failed AI job as successful',
      );
    });

    it('should return specific error for canceled→running', () => {
      const result = AiJobStateMachine.validateTransition(
        AiJobStatus.CANCELED,
        AiJobStatus.RUNNING,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot run a canceled AI job');
    });

    it('should return generic error for other invalid transitions', () => {
      const result = AiJobStateMachine.validateTransition(
        AiJobStatus.PENDING,
        AiJobStatus.SUCCESS,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not allowed');
    });
  });

  describe('getValidTransitions', () => {
    it('should return running and canceled for pending', () => {
      const transitions = AiJobStateMachine.getValidTransitions(
        AiJobStatus.PENDING,
      );
      expect(transitions).toEqual([AiJobStatus.RUNNING, AiJobStatus.CANCELED]);
    });

    it('should return success and fail for running', () => {
      const transitions = AiJobStateMachine.getValidTransitions(
        AiJobStatus.RUNNING,
      );
      expect(transitions).toEqual([AiJobStatus.SUCCESS, AiJobStatus.FAIL]);
    });

    it('should return empty array for terminal states', () => {
      expect(AiJobStateMachine.getValidTransitions(AiJobStatus.SUCCESS)).toEqual([]);
      expect(AiJobStateMachine.getValidTransitions(AiJobStatus.FAIL)).toEqual([]);
      expect(AiJobStateMachine.getValidTransitions(AiJobStatus.CANCELED)).toEqual([]);
    });
  });
});
