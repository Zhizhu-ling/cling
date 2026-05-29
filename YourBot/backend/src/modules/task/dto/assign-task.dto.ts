import {
  IsArray,
  IsInt,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single assignment item: maps a task to a member.
 */
export class AssignmentItemDto {
  @IsInt({ message: 'task_id must be an integer' })
  task_id: number;

  @IsInt({ message: 'member_id must be an integer' })
  member_id: number;
}

/**
 * DTO for batch task assignment.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
export class AssignTaskDto {
  @IsArray({ message: 'assignments must be an array' })
  @ArrayMinSize(1, { message: 'assignments must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  assignments: AssignmentItemDto[];
}
