import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';
import { ErrorCodes } from '../../domain/constants';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<any>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
    mockContext = {} as ExecutionContext;
  });

  it('should wrap response data in ApiResponse format', (done) => {
    const testData = { id: 1, name: 'test' };
    mockCallHandler = { handle: () => of(testData) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.code).toBe(ErrorCodes.SUCCESS);
      expect(result.message).toBe('success');
      expect(result.data).toEqual(testData);
      expect(result.request_id).toBeDefined();
      expect(result.request_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      done();
    });
  });

  it('should set data to null when handler returns undefined', (done) => {
    mockCallHandler = { handle: () => of(undefined) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.code).toBe(ErrorCodes.SUCCESS);
      expect(result.data).toBeNull();
      done();
    });
  });

  it('should set data to null when handler returns null', (done) => {
    mockCallHandler = { handle: () => of(null) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.code).toBe(ErrorCodes.SUCCESS);
      expect(result.data).toBeNull();
      done();
    });
  });

  it('should generate unique request_id for each response', (done) => {
    mockCallHandler = { handle: () => of({ test: true }) };

    const ids: string[] = [];

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      ids.push(result.request_id);

      interceptor
        .intercept(mockContext, mockCallHandler)
        .subscribe((result2) => {
          ids.push(result2.request_id);
          expect(ids[0]).not.toBe(ids[1]);
          done();
        });
    });
  });

  it('should handle array data correctly', (done) => {
    const testData = [1, 2, 3];
    mockCallHandler = { handle: () => of(testData) };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.code).toBe(0);
      done();
    });
  });
});
