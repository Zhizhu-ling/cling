import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';
import { PrismaService } from '../../infra/prisma';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { AiJobType, ReportType } from '../../domain/enums';
import { EventTypes } from '../../events/event-types';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';

describe('ReportService', () => {
  let service: ReportService;

  const mockPrisma = {
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAiJobService = {
    createAndDispatch: jest.fn(),
  };

  const mockOutboxService = {
    writeEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiJobService, useValue: mockAiJobService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should create and dispatch an AI job for report generation', async () => {
      const dto: GenerateReportDto = {
        report_type: ReportType.WEEKLY,
        date_from: '2025-01-01',
        date_to: '2025-01-07',
        project_id: '1',
      };

      mockAiJobService.createAndDispatch.mockResolvedValue('job-123');

      const result = await service.generateReport(dto, BigInt(10));

      expect(result).toEqual({ job_id: 'job-123' });
      expect(mockAiJobService.createAndDispatch).toHaveBeenCalledWith({
        jobType: AiJobType.REPORT_GENERATE,
        inputPayload: {
          report_type: 'weekly',
          date_from: '2025-01-01',
          date_to: '2025-01-07',
          project_id: '1',
          created_by: '10',
        },
        createdBy: BigInt(10),
        requestId: expect.any(String),
      });
    });

    it('should set project_id to null when not provided', async () => {
      const dto: GenerateReportDto = {
        report_type: ReportType.DAILY,
        date_from: '2025-01-01',
        date_to: '2025-01-01',
      };

      mockAiJobService.createAndDispatch.mockResolvedValue('job-456');

      await service.generateReport(dto, BigInt(5));

      expect(mockAiJobService.createAndDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          inputPayload: expect.objectContaining({
            project_id: null,
          }),
        }),
      );
    });
  });

  describe('onReportJobSuccess', () => {
    it('should save report and emit event in a transaction', async () => {
      const mockTx = {
        report: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(1),
            reportType: 'weekly',
            title: 'Weekly Report',
            aiGenerated: true,
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

      const outputPayload = {
        title: 'Weekly Report',
        summary: 'Summary text',
        content: '# Report content',
        risk_summary: 'No risks',
      };

      const inputPayload = {
        report_type: 'weekly',
        date_from: '2025-01-01',
        date_to: '2025-01-07',
        project_id: '1',
      };

      await service.onReportJobSuccess('job-1', outputPayload, BigInt(10), inputPayload);

      expect(mockTx.report.create).toHaveBeenCalledWith({
        data: {
          projectId: BigInt(1),
          reportType: 'weekly',
          dateFrom: new Date('2025-01-01'),
          dateTo: new Date('2025-01-07'),
          title: 'Weekly Report',
          summary: 'Summary text',
          content: '# Report content',
          riskSummary: 'No risks',
          aiGenerated: true,
          createdBy: BigInt(10),
        },
      });

      expect(mockOutboxService.writeEvent).toHaveBeenCalledWith(mockTx, {
        eventType: EventTypes.REPORT_GENERATED,
        aggregateType: 'report',
        aggregateId: BigInt(1),
        payload: {
          report_id: '1',
          report_type: 'weekly',
          title: 'Weekly Report',
          ai_generated: true,
          created_by: '10',
        },
      });
    });

    it('should handle null project_id', async () => {
      const mockTx = {
        report: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(2),
            reportType: 'daily',
            title: 'Daily Report',
            aiGenerated: true,
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

      const outputPayload = {
        title: 'Daily Report',
        summary: 'Summary',
        content: 'Content',
      };

      const inputPayload = {
        report_type: 'daily',
        date_from: '2025-01-01',
        date_to: '2025-01-01',
        project_id: null,
      };

      await service.onReportJobSuccess('job-2', outputPayload, BigInt(5), inputPayload);

      expect(mockTx.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: null,
          riskSummary: null,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated reports with default pagination', async () => {
      const mockReports = [
        { id: BigInt(1), title: 'Report 1', reportType: 'daily' },
        { id: BigInt(2), title: 'Report 2', reportType: 'weekly' },
      ];

      mockPrisma.report.findMany.mockResolvedValue(mockReports);
      mockPrisma.report.count.mockResolvedValue(2);

      const query: ReportQueryDto = {};
      const result = await service.findAll(query);

      expect(result).toEqual({
        list: mockReports,
        pagination: { page: 1, page_size: 20, total: 2 },
      });

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by report_type', async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const query: ReportQueryDto = { report_type: ReportType.WEEKLY };
      await service.findAll(query);

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reportType: 'weekly' },
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(0);

      const query: ReportQueryDto = {
        date_from: '2025-01-01',
        date_to: '2025-01-31',
      };
      await service.findAll(query);

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dateFrom: { gte: new Date('2025-01-01') },
            dateTo: { lte: new Date('2025-01-31') },
          },
        }),
      );
    });

    it('should apply custom pagination', async () => {
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.report.count.mockResolvedValue(50);

      const query: ReportQueryDto = { page: 3, page_size: 10 };
      const result = await service.findAll(query);

      expect(mockPrisma.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination).toEqual({ page: 3, page_size: 10, total: 50 });
    });
  });

  describe('findOne', () => {
    it('should return a report when found', async () => {
      const mockReport = {
        id: BigInt(1),
        title: 'Test Report',
        reportType: 'daily',
        aiGenerated: true,
      };

      mockPrisma.report.findUnique.mockResolvedValue(mockReport);

      const result = await service.findOne(BigInt(1));

      expect(result).toEqual(mockReport);
      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(service.findOne(BigInt(999))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update report fields and return updated report', async () => {
      const existingReport = {
        id: BigInt(1),
        title: 'Old Title',
        summary: 'Old Summary',
        content: 'Old Content',
        riskSummary: null,
      };

      const updatedReport = {
        ...existingReport,
        title: 'New Title',
        summary: 'New Summary',
      };

      mockPrisma.report.findUnique.mockResolvedValue(existingReport);
      mockPrisma.report.update.mockResolvedValue(updatedReport);

      const dto: UpdateReportDto = {
        title: 'New Title',
        summary: 'New Summary',
      };

      const result = await service.update(BigInt(1), dto);

      expect(result).toEqual(updatedReport);
      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          title: 'New Title',
          summary: 'New Summary',
        },
      });
    });

    it('should update risk_summary field', async () => {
      mockPrisma.report.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrisma.report.update.mockResolvedValue({ id: BigInt(1), riskSummary: 'New risk' });

      const dto: UpdateReportDto = { risk_summary: 'New risk' };
      await service.update(BigInt(1), dto);

      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { riskSummary: 'New risk' },
      });
    });

    it('should throw NotFoundException when report not found', async () => {
      mockPrisma.report.findUnique.mockResolvedValue(null);

      await expect(
        service.update(BigInt(999), { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
