import { IsEnum, IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { TaskStatus } from '../../../domain/enums/task-status.enum';

/**
 * DTO for updating task status.
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus, {
    message: `status must be one of: ${Object.values(TaskStatus).join(', ')}`,
  })
  status: TaskStatus;

  @IsOptional()
  @IsNumber({}, { message: 'progress must be a number' })
  @Min(0, { message: 'progress must be at least 0' })
  @Max(100, { message: 'progress must be at most 100' })
  progress?: number;

  @IsOptional()
  @IsString({ message: 'note must be a string' })
  note?: string;

  @IsOptional()
  @IsString({ message: 'blocked_reason must be a string' })
  blocked_reason?: string;
}
