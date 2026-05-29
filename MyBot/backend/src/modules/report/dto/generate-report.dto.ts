import { IsEnum, IsDateString, IsOptional, IsString } from 'class-validator';
import { ReportType } from '../../../domain/enums';

/**
 * DTO for submitting a report generation AI job.
 * Validates: Requirements 8.1
 */
export class GenerateReportDto {
  @IsEnum(ReportType, {
    message: `report_type must be one of: ${Object.values(ReportType).join(', ')}`,
  })
  report_type: ReportType;

  @IsDateString({}, { message: 'date_from must be a valid ISO date string' })
  date_from: string;

  @IsDateString({}, { message: 'date_to must be a valid ISO date string' })
  date_to: string;

  @IsOptional()
  @IsString()
  project_id?: string;
}
