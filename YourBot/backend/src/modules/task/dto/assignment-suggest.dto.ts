import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for requesting AI assignment suggestions.
 * Validates: Requirements 4.1, 4.2
 */
export class AssignmentSuggestDto {
  @IsArray({ message: 'task_ids must be an array' })
  @ArrayMinSize(1, { message: 'task_ids must contain at least one task ID' })
  @IsInt({ each: true, message: 'Each task_id must be an integer' })
  @Type(() => Number)
  task_ids: number[];
}
