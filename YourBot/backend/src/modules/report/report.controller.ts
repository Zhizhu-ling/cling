import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/interfaces';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';

/**
 * Report CRUD and generation controller.
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * POST /api/v1/reports/generate - Submit report generation AI job.
   * Only manager and admin can generate reports.
   * Returns the job_id for tracking the async AI job.
   * Validates: Requirements 8.1, 8.5
   */
  @Post('generate')
  @Roles('manager', 'admin')
  @HttpCode(200)
  async generate(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.generateReport(dto, user.userId);
  }

  /**
   * GET /api/v1/reports - Get paginated report list with filters.
   * Supports filtering by report_type and date range.
   * Validates: Requirements 8.1, 11.3
   */
  @Get()
  async findAll(@Query() query: ReportQueryDto) {
    return this.reportService.findAll(query);
  }

  /**
   * GET /api/v1/reports/:id - Get report detail.
   * Validates: Requirements 8.4
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.findOne(BigInt(id));
  }

  /**
   * PUT /api/v1/reports/:id - Edit report, update modification timestamp.
   * Only manager and admin can edit reports.
   * Validates: Requirements 8.3
   */
  @Put(':id')
  @Roles('manager', 'admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportService.update(BigInt(id), dto);
  }
}
