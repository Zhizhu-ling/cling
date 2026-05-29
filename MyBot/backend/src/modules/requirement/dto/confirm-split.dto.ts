import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * A single task item in the confirmed task tree.
 * Matches the AI split output structure (possibly edited by the manager).
 */
export class ConfirmSplitTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'task_key is required' })
  task_key: string;

  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'estimated_hours must be a number' })
  @IsOptional()
  @Type(() => Number)
  estimated_hours?: number;

  @IsArray()
  @IsOptional()
  dependencies?: string[];

  @IsString()
  @IsOptional()
  acceptance_criteria?: string;

  @IsString()
  @IsOptional()
  parent_key?: string;
}

/**
 * DTO for confirming an AI-generated task tree.
 * Validates: Requirements 3.3, 3.4
 */
export class ConfirmSplitDto {
  @IsArray({ message: 'tasks must be an array' })
  @ArrayMinSize(1, { message: 'tasks must contain at least one task' })
  @ValidateNested({ each: true })
  @Type(() => ConfirmSplitTaskDto)
  tasks: ConfirmSplitTaskDto[];
}
