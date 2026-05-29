import {
  AiError,
  NetworkError,
  ParseError,
  TimeoutError,
  BusinessValidationError,
} from './errors';

describe('AI Error Classes', () => {
  describe('AiError', () => {
    it('should set name and message', () => {
      const error = new AiError('base error');
      expect(error.name).toBe('AiError');
      expect(error.message).toBe('base error');
      expect(error.rawResponse).toBeUndefined();
    });

    it('should preserve raw response', () => {
      const error = new AiError('error', '{"raw": true}');
      expect(error.rawResponse).toBe('{"raw": true}');
    });

    it('should be an instance of Error', () => {
      const error = new AiError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('NetworkError', () => {
    it('should set correct name', () => {
      const error = new NetworkError('connection refused');
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('connection refused');
    });

    it('should be an instance of AiError', () => {
      const error = new NetworkError('test');
      expect(error).toBeInstanceOf(AiError);
    });
  });

  describe('ParseError', () => {
    it('should set correct name', () => {
      const error = new ParseError('invalid JSON');
      expect(error.name).toBe('ParseError');
      expect(error.message).toBe('invalid JSON');
    });

    it('should be an instance of AiError', () => {
      const error = new ParseError('test');
      expect(error).toBeInstanceOf(AiError);
    });
  });

  describe('TimeoutError', () => {
    it('should set correct name', () => {
      const error = new TimeoutError('request timed out');
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('request timed out');
    });

    it('should be an instance of AiError', () => {
      const error = new TimeoutError('test');
      expect(error).toBeInstanceOf(AiError);
    });
  });

  describe('BusinessValidationError', () => {
    it('should set correct name', () => {
      const error = new BusinessValidationError('invalid business data');
      expect(error.name).toBe('BusinessValidationError');
      expect(error.message).toBe('invalid business data');
    });

    it('should be an instance of AiError', () => {
      const error = new BusinessValidationError('test');
      expect(error).toBeInstanceOf(AiError);
    });

    it('should preserve raw response for debugging', () => {
      const raw = '{"task_id": "invalid"}';
      const error = new BusinessValidationError('bad ref', raw);
      expect(error.rawResponse).toBe(raw);
    });
  });
});
