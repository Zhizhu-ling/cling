import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating an existing report.
 * Validates: Requirements 8.3
 */
export class UpdateReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  risk_summary?: string;
}
