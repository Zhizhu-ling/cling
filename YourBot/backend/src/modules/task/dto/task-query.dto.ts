import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus } from '../../../domain/enums';

/**
 * DTO for querying tasks with pagination and filtering.
 * Validates: Requirements 7.1, 7.3, 11.3
 */
export class TaskQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  page_size?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  requirement_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  owner_id?: number;

  @IsOptional()
  @IsEnum(TaskStatus, {
    message: `status must be one of: ${Object.values(TaskStatus).join(', ')}`,
  })
  status?: TaskStatus;
}
