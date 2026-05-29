import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ErrorCodes } from '../../domain/constants';

/**
 * Interceptor that wraps all successful responses in the unified ApiResponse format.
 * Generates a unique request_id (UUID v4) for every response.
 * Validates: Requirements 11.1, 11.4
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: ErrorCodes.SUCCESS,
        message: 'success',
        data: data ?? null,
        request_id: uuidv4(),
      })),
    );
  }
}
