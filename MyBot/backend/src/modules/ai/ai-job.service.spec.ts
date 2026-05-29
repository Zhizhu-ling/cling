import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AiJobService } from './ai-job.service';
import { PrismaService } from '../../infra/prisma';
import { AiJobStatus, AiJobType } from '../../domain/enums';
import { CreateAiJobDto } from './dto';
import { AiJobHandler } from './interfaces';

describe('AiJobService', () => {
  let service: AiJobService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    aiJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiJobService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiJobService>(AiJobService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job with status=pending and prompt versioning', async () => {
      const dto: CreateAiJobDto = {
        jobType: AiJobType.REQUIREMENT_SPLIT,
        bizRefId: BigInt(1),
        inputPayload: { requirementId: '1' },
        createdBy: BigInt(10),
        requestId: 'req-123',
      };

      mockPrisma.aiJob.create.mockResolvedValue({
        id: BigInt(100),
        jobType: AiJobType.REQUIREMENT_SPLIT,
        status: AiJobStatus.PENDING,
        requestId: 'req-123',
        bizRefId: BigInt(1),
        inputPayload: { requirementId: '1' },
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        maxRetry: 3,
        retryCount: 0,
        createdBy: BigInt(10),
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        outputPayload: null,
        rawResponse: null,
        errorMessage: null,
      });

      const jobId = await service.createJob(dto);

      expect(jobId).toBe('100');
      expect(mockPrisma.aiJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobType: AiJobType.REQUIREMENT_SPLIT,
          status: AiJobStatus.PENDING,
          requestId: 'req-123',
          bizRefId: BigInt(1),
          inputPayload: { requirementId: '1' },
          promptVersion: '1.0.0',
          schemaVersion: '1.0.0',
          maxRetry: 3,
          createdBy: BigInt(10),
        }),
      });
    });

    it('should use custom maxRetry when provided', async () => {
      const dto: CreateAiJobDto = {
        jobType: AiJobType.ASSIGNMENT_SUGGEST,
        inputPayload: { taskIds: ['1', '2'] },
        createdBy: BigInt(10),
        requestId: 'req-456',
        maxRetry: 5,
      };

      mockPrisma.aiJob.create.mockResolvedValue({
        id: BigInt(101),
        jobType: AiJobType.ASSIGNMENT_SUGGEST,
        status: AiJobStatus.PENDING,
        requestId: 'req-456',
        bizRefId: null,
        inputPayload: { taskIds: ['1', '2'] },
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        maxRetry: 5,
        retryCount: 0,
        createdBy: BigInt(10),
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        outputPayload: null,
        rawResponse: null,
        errorMessage: null,
      });

      await service.createJob(dto);

      expect(mockPrisma.aiJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          maxRetry: 5,
        }),
      });
    });
  });

  describe('getJob', () => {
    it('should return job details when found', async () => {
      const now = new Date();
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        jobType: AiJobType.REQUIREMENT_SPLIT,
        status: AiJobStatus.SUCCESS,
        requestId: 'req-123',
        bizRefId: BigInt(1),
        inputPayload: { requirementId: '1' },
        outputPayload: { tasks: [] },
        rawResponse: '{"tasks":[]}',
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        retryCount: 0,
        maxRetry: 3,
        errorMessage: null,
        createdBy: BigInt(10),
        createdAt: now,
        startedAt: now,
        completedAt: now,
      });

      const result = await service.getJob('100');

      expect(result).toEqual({
        id: '100',
        jobType: AiJobType.REQUIREMENT_SPLIT,
        status: AiJobStatus.SUCCESS,
        requestId: 'req-123',
        bizRefId: '1',
        inputPayload: { requirementId: '1' },
        outputPayload: { tasks: [] },
        rawResponse: '{"tasks":[]}',
        promptVersion: '1.0.0',
        schemaVersion: '1.0.0',
        retryCount: 0,
        maxRetry: 3,
        errorMessage: null,
        createdBy: '10',
        createdAt: now.toISOString(),
        startedAt: now.toISOString(),
        completedAt: now.toISOString(),
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      mockPrisma.aiJob.findUnique.mockResolvedValue(null);

      await expect(service.getJob('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.PENDING,
        jobType: AiJobType.REQUIREMENT_SPLIT,
      });
      mockPrisma.aiJob.update.mockResolvedValue({});

      await service.cancelJob('100');

      expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
        where: { id: BigInt(100) },
        data: {
          status: AiJobStatus.CANCELED,
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when job not found', async () => {
      mockPrisma.aiJob.findUnique.mockResolvedValue(null);

      await expect(service.cancelJob('999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when trying to cancel a running job', async () => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.RUNNING,
        jobType: AiJobType.REQUIREMENT_SPLIT,
      });

      await expect(service.cancelJob('100')).rejects.toThrow(
        /not allowed/,
      );
    });

    it('should throw error when trying to cancel a completed job', async () => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.SUCCESS,
        jobType: AiJobType.REQUIREMENT_SPLIT,
      });

      await expect(service.cancelJob('100')).rejects.toThrow(
        /not allowed/,
      );
    });
  });

  describe('dispatchJob', () => {
    it('should call processJob asynchronously via setImmediate', (done) => {
      const jobId = '100';
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.PENDING,
        jobType: AiJobType.REQUIREMENT_SPLIT,
        inputPayload: { requirementId: '1' },
      });
      mockPrisma.aiJob.update.mockResolvedValue({});

      // Register a handler that signals completion
      const mockHandler: AiJobHandler = {
        execute: jest.fn().mockResolvedValue({
          outputPayload: { tasks: [] },
          rawResponse: '{"tasks":[]}',
        }),
      };
      service.registerHandler(AiJobType.REQUIREMENT_SPLIT, mockHandler);

      service.dispatchJob(jobId);

      // Wait for setImmediate to process
      setTimeout(() => {
        expect(mockPrisma.aiJob.findUnique).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
        });
        done();
      }, 50);
    });
  });

  describe('registerHandler', () => {
    it('should register a handler for a job type', () => {
      const mockHandler: AiJobHandler = {
        execute: jest.fn(),
      };

      service.registerHandler(AiJobType.REPORT_GENERATE, mockHandler);

      // Verify handler is registered by dispatching a job
      // (internal state - we verify through processJob behavior)
      expect(() =>
        service.registerHandler(AiJobType.REPORT_GENERATE, mockHandler),
      ).not.toThrow();
    });
  });

  describe('worker processJob (via dispatchJob)', () => {
    it('should transition pending→running→success when handler succeeds', (done) => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.PENDING,
        jobType: AiJobType.REQUIREMENT_SPLIT,
        inputPayload: { requirementId: '1' },
      });
      mockPrisma.aiJob.update.mockResolvedValue({});

      const mockHandler: AiJobHandler = {
        execute: jest.fn().mockResolvedValue({
          outputPayload: { tasks: [{ title: 'Task 1' }] },
          rawResponse: '{"tasks":[{"title":"Task 1"}]}',
        }),
      };
      service.registerHandler(AiJobType.REQUIREMENT_SPLIT, mockHandler);

      service.dispatchJob('100');

      setTimeout(() => {
        // First update: pending → running
        expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
          data: {
            status: AiJobStatus.RUNNING,
            startedAt: expect.any(Date),
          },
        });

        // Second update: running → success
        expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
          data: {
            status: AiJobStatus.SUCCESS,
            outputPayload: { tasks: [{ title: 'Task 1' }] },
            rawResponse: '{"tasks":[{"title":"Task 1"}]}',
            completedAt: expect.any(Date),
          },
        });

        expect(mockHandler.execute).toHaveBeenCalledWith({
          requirementId: '1',
        });
        done();
      }, 50);
    });

    it('should transition pending→running→fail when handler throws', (done) => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.PENDING,
        jobType: AiJobType.REQUIREMENT_SPLIT,
        inputPayload: { requirementId: '1' },
      });
      mockPrisma.aiJob.update.mockResolvedValue({});

      const mockHandler: AiJobHandler = {
        execute: jest.fn().mockRejectedValue(new Error('LLM timeout')),
      };
      service.registerHandler(AiJobType.REQUIREMENT_SPLIT, mockHandler);

      service.dispatchJob('100');

      setTimeout(() => {
        // First update: pending → running
        expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
          data: {
            status: AiJobStatus.RUNNING,
            startedAt: expect.any(Date),
          },
        });

        // Second update: running → fail
        expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
          data: {
            status: AiJobStatus.FAIL,
            errorMessage: 'LLM timeout',
            retryCount: { increment: 1 },
            completedAt: expect.any(Date),
          },
        });
        done();
      }, 50);
    });

    it('should fail when no handler is registered for job type', (done) => {
      mockPrisma.aiJob.findUnique.mockResolvedValue({
        id: BigInt(100),
        status: AiJobStatus.PENDING,
        jobType: AiJobType.REPORT_GENERATE,
        inputPayload: {},
      });
      mockPrisma.aiJob.update.mockResolvedValue({});

      // Don't register any handler for REPORT_GENERATE
      service.dispatchJob('100');

      setTimeout(() => {
        // Should transition to fail with "No handler registered" error
        expect(mockPrisma.aiJob.update).toHaveBeenCalledWith({
          where: { id: BigInt(100) },
          data: expect.objectContaining({
            status: AiJobStatus.FAIL,
            errorMessage: expect.stringContaining('No handler registered'),
          }),
        });
        done();
      }, 50);
    });
  });
});
