import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType } from '../../../domain/enums';

/**
 * DTO for querying reports with pagination and filtering.
 * Validates: Requirements 8.1, 11.3
 */
export class ReportQueryDto {
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
  @IsEnum(ReportType, {
    message: `report_type must be one of: ${Object.values(ReportType).join(', ')}`,
  })
  report_type?: ReportType;

  @IsOptional()
  @IsDateString({}, { message: 'date_from must be a valid ISO date string' })
  date_from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'date_to must be a valid ISO date string' })
  date_to?: string;
}
