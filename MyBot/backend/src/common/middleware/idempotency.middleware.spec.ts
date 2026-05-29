import { IdempotencyMiddleware } from './idempotency.middleware';
import { Request, Response } from 'express';

describe('IdempotencyMiddleware', () => {
  let middleware: IdempotencyMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    middleware = new IdempotencyMiddleware();
    mockNext = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow GET requests through without checking idempotency', () => {
    mockReq = {
      method: 'GET',
      headers: { 'x-idempotency-key': 'test-key-1' },
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should allow POST requests without X-Idempotency-Key header', () => {
    mockReq = {
      method: 'POST',
      headers: {},
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should allow first POST request with a new idempotency key', () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-idempotency-key': 'unique-key-1' },
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should reject duplicate POST request with same idempotency key', () => {
    mockReq = {
      method: 'POST',
      headers: { 'x-idempotency-key': 'duplicate-key' },
    };

    // First request - should pass
    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    // Reset mocks
    mockNext.mockClear();

    // Second request with same key - should be rejected
    middleware.use(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 409,
        message: 'Duplicate request',
        data: null,
      }),
    );
  });

  it('should reject duplicate PUT request with same idempotency key', () => {
    mockReq = {
      method: 'PUT',
      headers: { 'x-idempotency-key': 'put-key-1' },
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    mockNext.mockClear();

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('should reject duplicate PATCH request with same idempotency key', () => {
    mockReq = {
      method: 'PATCH',
      headers: { 'x-idempotency-key': 'patch-key-1' },
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    mockNext.mockClear();

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('should reject duplicate DELETE request with same idempotency key', () => {
    mockReq = {
      method: 'DELETE',
      headers: { 'x-idempotency-key': 'delete-key-1' },
    };

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    mockNext.mockClear();

    middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('should allow different idempotency keys for same method', () => {
    const req1: Partial<Request> = {
      method: 'POST',
      headers: { 'x-idempotency-key': 'key-a' },
    };
    const req2: Partial<Request> = {
      method: 'POST',
      headers: { 'x-idempotency-key': 'key-b' },
    };

    middleware.use(req1 as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    middleware.use(req2 as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });
});
