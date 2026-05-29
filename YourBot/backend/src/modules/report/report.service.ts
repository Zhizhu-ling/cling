import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infra/prisma';
import { AiJobType } from '../../domain/enums';
import { normalizePagination, PaginatedList } from '../../common/interfaces';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { EventTypes } from '../../events/event-types';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report } from '@prisma/client';

/**
 * ReportService handles report generation via AI jobs, CRUD operations,
 * and event emission via the outbox pattern.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobService: AiJobService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Submit a report generation AI job.
   * Creates an AI job of type REPORT_GENERATE and dispatches it.
   * On success, the handler callback saves the report.
   *
   * Validates: Requirements 8.1, 8.5
   */
  async generateReport(
    dto: GenerateReportDto,
    userId: bigint,
  ): Promise<{ job_id: string }> {
    const jobId = await this.aiJobService.createAndDispatch({
      jobType: AiJobType.REPORT_GENERATE,
      inputPayload: {
        report_type: dto.report_type,
        date_from: dto.date_from,
        date_to: dto.date_to,
        project_id: dto.project_id ?? null,
        created_by: userId.toString(),
      },
      createdBy: userId,
      requestId: uuidv4(),
    });

    return { job_id: jobId };
  }

  /**
   * Called when the AI report generation job succeeds.
   * Saves the report to the database with ai_generated=true and emits
   * a report.generated event via the outbox, all within a transaction.
   *
   * Validates: Requirements 8.2, 8.5
   */
  async onReportJobSuccess(
    jobId: string,
    outputPayload: Record<string, any>,
    userId: bigint,
    inputPayload: Record<string, any>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Save the report
      const report = await tx.report.create({
        data: {
          projectId: inputPayload.project_id
            ? BigInt(inputPayload.project_id)
            : null,
          reportType: inputPayload.report_type,
          dateFrom: new Date(inputPayload.date_from),
          dateTo: new Date(inputPayload.date_to),
          title: outputPayload.title || 'AI Generated Report',
          summary: outputPayload.summary || null,
          content: outputPayload.content || null,
          riskSummary: outputPayload.risk_summary || null,
          aiGenerated: true,
          createdBy: userId,
        },
      });

      // Emit report.generated event via outbox
      await this.outboxService.writeEvent(tx, {
        eventType: EventTypes.REPORT_GENERATED,
        aggregateType: 'report',
        aggregateId: report.id,
        payload: {
          report_id: report.id.toString(),
          report_type: report.reportType,
          title: report.title,
          ai_generated: true,
          created_by: userId.toString(),
        },
      });
    });
  }

  /**
   * Get paginated list of reports with optional filters.
   * Supports filtering by report_type and date range.
   *
   * Validates: Requirements 8.1, 11.3
   */
  async findAll(query: ReportQueryDto): Promise<PaginatedList<Report>> {
    const { page, page_size } = normalizePagination(query);

    // Build filter conditions
    const where: Record<string, any> = {};
    if (query.report_type) {
      where.reportType = query.report_type;
    }
    if (query.date_from) {
      where.dateFrom = { ...(where.dateFrom || {}), gte: new Date(query.date_from) };
    }
    if (query.date_to) {
      where.dateTo = { ...(where.dateTo || {}), lte: new Date(query.date_to) };
    }

    const [list, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        page_size,
        total,
      },
    };
  }

  /**
   * Get a single report by ID.
   */
  async findOne(id: bigint): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report with id ${id} not found`);
    }

    return report;
  }

  /**
   * Update an existing report.
   * Persists changes and updates the modification timestamp.
   *
   * Validates: Requirements 8.3
   */
  async update(id: bigint, dto: UpdateReportDto): Promise<Report> {
    const existing = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Report with id ${id} not found`);
    }

    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.risk_summary !== undefined) updateData.riskSummary = dto.risk_summary;

    const updated = await this.prisma.report.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }
}
