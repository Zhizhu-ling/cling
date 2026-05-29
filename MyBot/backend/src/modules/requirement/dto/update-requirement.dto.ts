import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementStatus } from '../../../domain/enums';

/**
 * DTO for updating an existing requirement.
 * All fields are optional - only provided fields will be updated.
 * Validates: Requirements 2.4
 */
export class UpdateRequirementDto {
  @IsString()
  @IsNotEmpty({ message: 'title cannot be empty' })
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty({ message: 'background cannot be empty' })
  @IsOptional()
  background?: string;

  @IsString()
  @IsNotEmpty({ message: 'objective cannot be empty' })
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  constraints?: string;

  @IsArray({ message: 'deliverables must be an array' })
  @IsOptional()
  deliverables?: any[];

  @IsInt({ message: 'priority must be an integer' })
  @Min(1, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' })
  @Max(4, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' })
  @Type(() => Number)
  @IsOptional()
  priority?: number;

  @IsDateString({}, { message: 'due_date must be a valid date string (ISO 8601)' })
  @IsOptional()
  due_date?: string;

  @IsEnum(RequirementStatus, {
    message: `status must be one of: ${Object.values(RequirementStatus).join(', ')}`,
  })
  @IsOptional()
  status?: RequirementStatus;

  @IsOptional()
  @Type(() => Number)
  project_id?: number;
}
