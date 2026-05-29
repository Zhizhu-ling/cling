import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCodes } from '../../domain/constants';
import { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Global exception filter that maps all exceptions to the unified ApiResponse format.
 * Validates: Requirements 11.1, 11.2, 11.4
 *
 * Error code mapping:
 * - BadRequestException (400) -> 40001 (validation error)
 * - UnauthorizedException (401) -> 40101 (unauthorized)
 * - ForbiddenException (403) -> 40301 (forbidden)
 * - NotFoundException (404) -> 40401 (not found)
 * - Other exceptions -> 50001 (server error)
 * - AI-specific errors -> 50002 (AI error)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { code, message, httpStatus } = this.mapException(exception);

    const body: ApiResponse<null> = {
      code,
      message,
      data: null,
      request_id: uuidv4(),
    };

    response.status(httpStatus).json(body);
  }

  private mapException(exception: unknown): {
    code: number;
    message: string;
    httpStatus: number;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extract message from exception response
      let message: string;
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(resp.message)) {
          message = resp.message.join('; ');
        } else if (typeof resp.message === 'string') {
          message = resp.message;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      // Check for AI-specific error
      if (this.isAiError(exception)) {
        return {
          code: ErrorCodes.AI_ERROR,
          message,
          httpStatus: status,
        };
      }

      // Map HTTP status to error code
      const code = this.httpStatusToErrorCode(status);
      return { code, message, httpStatus: status };
    }

    // Unhandled exceptions -> 50001 server error
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    return {
      code: ErrorCodes.SERVER_ERROR,
      message,
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  private httpStatusToErrorCode(status: number): number {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      default:
        return ErrorCodes.SERVER_ERROR;
    }
  }

  private isAiError(exception: HttpException): boolean {
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      return resp.errorType === 'AI_ERROR' || resp.code === ErrorCodes.AI_ERROR;
    }
    return false;
  }
}
