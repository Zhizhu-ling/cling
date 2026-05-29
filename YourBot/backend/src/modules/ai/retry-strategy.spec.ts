import {
  executeWithRetry,
  getMaxRetriesForError,
  calculateBackoffDelay,
  RetryExhaustedError,
  RetryConfig,
} from './retry-strategy';
import {
  AiError,
  NetworkError,
  ParseError,
  TimeoutError,
  BusinessValidationError,
} from './errors';

const DEFAULT_CONFIG: RetryConfig = {
  networkMaxRetries: 2,
  parseMaxRetries: 1,
  timeoutMaxRetries: 1,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// No-op delay for tests
const noDelay = async () => {};

describe('getMaxRetriesForError', () => {
  it('should return 2 for NetworkError', () => {
    const error = new NetworkError('connection refused');
    expect(getMaxRetriesForError(error, DEFAULT_CONFIG)).toBe(2);
  });

  it('should return 1 for ParseError', () => {
    const error = new ParseError('invalid JSON');
    expect(getMaxRetriesForError(error, DEFAULT_CONFIG)).toBe(1);
  });

  it('should return 1 for TimeoutError', () => {
    const error = new TimeoutError('request timed out');
    expect(getMaxRetriesForError(error, DEFAULT_CONFIG)).toBe(1);
  });

  it('should return 0 for BusinessValidationError', () => {
    const error = new BusinessValidationError('invalid business data');
    expect(getMaxRetriesForError(error, DEFAULT_CONFIG)).toBe(0);
  });

  it('should return 0 for unknown AiError', () => {
    const error = new AiError('unknown');
    expect(getMaxRetriesForError(error, DEFAULT_CONFIG)).toBe(0);
  });
});

describe('calculateBackoffDelay', () => {
  it('should return a value based on exponential backoff', () => {
    // attempt 0: baseDelay * 2^0 = 1000 + jitter
    const delay = calculateBackoffDelay(0, DEFAULT_CONFIG);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1500); // 1000 + max jitter (500)
  });

  it('should increase delay with attempt number', () => {
    // We test multiple times to account for jitter
    const delays: number[] = [];
    for (let i = 0; i < 100; i++) {
      delays.push(calculateBackoffDelay(2, DEFAULT_CONFIG));
    }
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    // attempt 2: baseDelay * 2^2 = 4000 + jitter (avg ~250)
    expect(avgDelay).toBeGreaterThan(3500);
    expect(avgDelay).toBeLessThan(5000);
  });

  it('should cap delay at maxDelayMs', () => {
    const delay = calculateBackoffDelay(10, DEFAULT_CONFIG);
    expect(delay).toBeLessThanOrEqual(DEFAULT_CONFIG.maxDelayMs);
  });
});

describe('executeWithRetry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await executeWithRetry(fn, {}, noDelay);

    expect(result).toEqual({ result: 'success', attempts: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  describe('NetworkError retries', () => {
    it('should retry up to 2 times for NetworkError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('fail 1'))
        .mockRejectedValueOnce(new NetworkError('fail 2'))
        .mockResolvedValue('success');

      const result = await executeWithRetry(fn, {}, noDelay);

      expect(result).toEqual({ result: 'success', attempts: 3 });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryExhaustedError after 2 failed retries for NetworkError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('fail 1'))
        .mockRejectedValueOnce(new NetworkError('fail 2'))
        .mockRejectedValueOnce(new NetworkError('fail 3'));

      await expect(executeWithRetry(fn, {}, noDelay)).rejects.toThrow(
        RetryExhaustedError,
      );
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should preserve raw_response in RetryExhaustedError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('fail 1', 'raw1'))
        .mockRejectedValueOnce(new NetworkError('fail 2', 'raw2'))
        .mockRejectedValueOnce(new NetworkError('fail 3', 'raw3'));

      try {
        await executeWithRetry(fn, {}, noDelay);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryExhaustedError);
        const retryError = error as RetryExhaustedError;
        expect(retryError.rawResponse).toBe('raw3');
        expect(retryError.totalAttempts).toBe(3);
      }
    });
  });

  describe('ParseError retries', () => {
    it('should retry 1 time for ParseError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new ParseError('bad json'))
        .mockResolvedValue('success');

      const result = await executeWithRetry(fn, {}, noDelay);

      expect(result).toEqual({ result: 'success', attempts: 2 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw RetryExhaustedError after 1 failed retry for ParseError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new ParseError('bad json 1'))
        .mockRejectedValueOnce(new ParseError('bad json 2'));

      await expect(executeWithRetry(fn, {}, noDelay)).rejects.toThrow(
        RetryExhaustedError,
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('TimeoutError retries', () => {
    it('should retry 1 time for TimeoutError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new TimeoutError('timeout'))
        .mockResolvedValue('success');

      const result = await executeWithRetry(fn, {}, noDelay);

      expect(result).toEqual({ result: 'success', attempts: 2 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw RetryExhaustedError after 1 failed retry for TimeoutError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new TimeoutError('timeout 1'))
        .mockRejectedValueOnce(new TimeoutError('timeout 2'));

      await expect(executeWithRetry(fn, {}, noDelay)).rejects.toThrow(
        RetryExhaustedError,
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('BusinessValidationError - no retry', () => {
    it('should throw immediately without retry for BusinessValidationError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(
          new BusinessValidationError('invalid data', '{"bad": true}'),
        );

      await expect(executeWithRetry(fn, {}, noDelay)).rejects.toThrow(
        BusinessValidationError,
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should preserve raw_response on BusinessValidationError', async () => {
      const rawResponse = '{"invalid": "business data"}';
      const fn = jest
        .fn()
        .mockRejectedValueOnce(
          new BusinessValidationError('validation failed', rawResponse),
        );

      try {
        await executeWithRetry(fn, {}, noDelay);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessValidationError);
        expect((error as BusinessValidationError).rawResponse).toBe(
          rawResponse,
        );
      }
    });
  });

  describe('non-AiError handling', () => {
    it('should throw immediately for non-AiError errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('generic error'));

      await expect(executeWithRetry(fn, {}, noDelay)).rejects.toThrow(
        'generic error',
      );
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom config', () => {
    it('should respect custom retry limits', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('fail 1'))
        .mockRejectedValueOnce(new NetworkError('fail 2'));

      // Set networkMaxRetries to 1 (only 1 retry allowed)
      await expect(
        executeWithRetry(fn, { networkMaxRetries: 1 }, noDelay),
      ).rejects.toThrow(RetryExhaustedError);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('delay function', () => {
    it('should call delay function between retries', async () => {
      const delayFn = jest.fn().mockResolvedValue(undefined);
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('fail'))
        .mockResolvedValue('success');

      await executeWithRetry(fn, {}, delayFn);

      expect(delayFn).toHaveBeenCalledTimes(1);
      expect(delayFn).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
