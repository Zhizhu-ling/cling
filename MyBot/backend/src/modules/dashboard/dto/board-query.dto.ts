import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying the kanban board with optional filters.
 * Validates: Requirements 7.1, 7.3
 */
export class BoardQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  requirement_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  owner_id?: number;
}
