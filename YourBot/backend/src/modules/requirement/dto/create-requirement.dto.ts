import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new requirement.
 * Validates: Requirements 2.1, 2.2, 2.5, 2.6
 */
export class CreateRequirementDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'background is required' })
  background: string;

  @IsString()
  @IsNotEmpty({ message: 'objective is required' })
  objective: string;

  @IsString()
  @IsOptional()
  constraints?: string;

  @IsArray({ message: 'deliverables must be an array' })
  @IsNotEmpty({ message: 'deliverables is required' })
  deliverables: any[];

  @IsInt({ message: 'priority must be an integer' })
  @Min(1, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' })
  @Max(4, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' })
  @Type(() => Number)
  priority: number;

  @IsDateString({}, { message: 'due_date must be a valid date string (ISO 8601)' })
  @IsNotEmpty({ message: 'due_date is required' })
  due_date: string;

  @IsOptional()
  @Type(() => Number)
  project_id?: number;
}
