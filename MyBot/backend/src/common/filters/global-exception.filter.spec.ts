import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ErrorCodes } from '../../domain/constants';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    };
  });

  it('should map BadRequestException to code 40001', () => {
    const exception = new BadRequestException('Validation failed');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(body.message).toBe('Validation failed');
    expect(body.data).toBeNull();
    expect(body.request_id).toBeDefined();
    expect(body.request_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should map UnauthorizedException to code 40101', () => {
    const exception = new UnauthorizedException('Unauthorized');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.UNAUTHORIZED);
    expect(body.message).toBe('Unauthorized');
  });

  it('should map ForbiddenException to code 40301', () => {
    const exception = new ForbiddenException('Forbidden');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.FORBIDDEN);
    expect(body.message).toBe('Forbidden');
  });

  it('should map NotFoundException to code 40401', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.NOT_FOUND);
    expect(body.message).toBe('Not found');
  });

  it('should map unknown exceptions to code 50001', () => {
    const exception = new Error('Something went wrong');
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.SERVER_ERROR);
    expect(body.message).toBe('Something went wrong');
  });

  it('should map AI errors to code 50002', () => {
    const exception = new HttpException(
      { message: 'AI service timeout', errorType: 'AI_ERROR' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.AI_ERROR);
    expect(body.message).toBe('AI service timeout');
  });

  it('should handle validation errors with array messages', () => {
    const exception = new BadRequestException({
      message: ['field1 is required', 'field2 must be a number'],
      error: 'Bad Request',
    });
    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(body.message).toBe('field1 is required; field2 must be a number');
  });

  it('should generate unique request_id for each response', () => {
    const exception = new BadRequestException('test');
    filter.catch(exception, mockHost);
    const id1 = mockResponse.json.mock.calls[0][0].request_id;

    filter.catch(exception, mockHost);
    const id2 = mockResponse.json.mock.calls[1][0].request_id;

    expect(id1).not.toBe(id2);
  });

  it('should handle non-Error exceptions gracefully', () => {
    filter.catch('string error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.code).toBe(ErrorCodes.SERVER_ERROR);
    expect(body.message).toBe('Internal server error');
  });
});
