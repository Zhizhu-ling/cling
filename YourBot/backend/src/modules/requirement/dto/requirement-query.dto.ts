import { IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus } from '../../../domain/enums';

/**
 * DTO for querying requirements with pagination, filtering, and sorting.
 * Validates: Requirements 2.3, 11.3
 */
export class RequirementQueryDto {
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
  @IsEnum(RequirementStatus, {
    message: `status must be one of: ${Object.values(RequirementStatus).join(', ')}`,
  })
  status?: RequirementStatus;

  @IsOptional()
  @IsInt({ message: 'priority must be an integer' })
  @Min(1)
  @Max(4)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsIn(['created_at', 'due_date'], {
    message: 'sort_by must be one of: created_at, due_date',
  })
  sort_by?: 'created_at' | 'due_date';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_order must be asc or desc' })
  sort_order?: 'asc' | 'desc';
}
