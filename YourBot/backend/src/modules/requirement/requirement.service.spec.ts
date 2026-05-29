import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequirementService } from './requirement.service';
import { PrismaService } from '../../infra/prisma';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { RequirementStatus } from '../../domain/enums';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementQueryDto } from './dto/requirement-query.dto';
import { ConfirmSplitDto } from './dto/confirm-split.dto';

describe('RequirementService', () => {
  let service: RequirementService;
  let prisma: {
    requirement: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let aiJobService: {
    createAndDispatch: jest.Mock;
  };
  let outboxService: {
    writeEvent: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      requirement: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    aiJobService = {
      createAndDispatch: jest.fn(),
    };

    outboxService = {
      writeEvent: jest.fn().mockResolvedValue({ id: BigInt(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiJobService, useValue: aiJobService },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get<RequirementService>(RequirementService);
  });

  describe('create', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const validDto: CreateRequirementDto = {
      title: 'Test Requirement',
      background: 'Test background',
      objective: 'Test objective',
      deliverables: ['item1', 'item2'],
      priority: 2,
      due_date: futureDateStr,
    };

    it('should create a requirement with valid data', async () => {
      prisma.requirement.create.mockResolvedValue({
        id: BigInt(1),
        status: RequirementStatus.DRAFT,
      });

      const result = await service.create(validDto, BigInt(1));

      expect(result).toEqual({ id: BigInt(1), status: 'draft' });
      expect(prisma.requirement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Requirement',
          background: 'Test background',
          objective: 'Test objective',
          deliverables: ['item1', 'item2'],
          priority: 2,
          status: 'draft',
          createdBy: BigInt(1),
        }),
      });
    });

    it('should reject due_date in the past', async () => {
      const pastDto = { ...validDto, due_date: '2020-01-01' };

      await expect(service.create(pastDto, BigInt(1))).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(pastDto, BigInt(1))).rejects.toThrow(
        'due_date must be a future date',
      );
    });

    it('should set projectId when provided', async () => {
      const dtoWithProject = { ...validDto, project_id: 5 };
      prisma.requirement.create.mockResolvedValue({
        id: BigInt(1),
        status: RequirementStatus.DRAFT,
      });

      await service.create(dtoWithProject, BigInt(1));

      expect(prisma.requirement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: BigInt(5),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated list with default pagination', async () => {
      const mockRequirements = [
        { id: BigInt(1), title: 'Req 1', status: 'draft' },
        { id: BigInt(2), title: 'Req 2', status: 'draft' },
      ];
      prisma.requirement.findMany.mockResolvedValue(mockRequirements);
      prisma.requirement.count.mockResolvedValue(2);

      const query: RequirementQueryDto = {};
      const result = await service.findAll(query);

      expect(result.list).toEqual(mockRequirements);
      expect(result.pagination).toEqual({ page: 1, page_size: 20, total: 2 });
    });

    it('should apply status filter', async () => {
      prisma.requirement.findMany.mockResolvedValue([]);
      prisma.requirement.count.mockResolvedValue(0);

      const query: RequirementQueryDto = { status: RequirementStatus.DRAFT };
      await service.findAll(query);

      expect(prisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'draft' },
        }),
      );
    });

    it('should apply priority filter', async () => {
      prisma.requirement.findMany.mockResolvedValue([]);
      prisma.requirement.count.mockResolvedValue(0);

      const query: RequirementQueryDto = { priority: 1 };
      await service.findAll(query);

      expect(prisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { priority: 1 },
        }),
      );
    });

    it('should sort by due_date ascending', async () => {
      prisma.requirement.findMany.mockResolvedValue([]);
      prisma.requirement.count.mockResolvedValue(0);

      const query: RequirementQueryDto = {
        sort_by: 'due_date',
        sort_order: 'asc',
      };
      await service.findAll(query);

      expect(prisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dueDate: 'asc' },
        }),
      );
    });

    it('should default sort to createdAt desc', async () => {
      prisma.requirement.findMany.mockResolvedValue([]);
      prisma.requirement.count.mockResolvedValue(0);

      const query: RequirementQueryDto = {};
      await service.findAll(query);

      expect(prisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      prisma.requirement.findMany.mockResolvedValue([]);
      prisma.requirement.count.mockResolvedValue(50);

      const query: RequirementQueryDto = { page: 3, page_size: 10 };
      const result = await service.findAll(query);

      expect(prisma.requirement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination).toEqual({ page: 3, page_size: 10, total: 50 });
    });
  });

  describe('findOne', () => {
    it('should return a requirement by id', async () => {
      const mockReq = { id: BigInt(1), title: 'Test', status: 'draft' };
      prisma.requirement.findUnique.mockResolvedValue(mockReq);

      const result = await service.findOne(BigInt(1));

      expect(result).toEqual(mockReq);
      expect(prisma.requirement.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when requirement not found', async () => {
      prisma.requirement.findUnique.mockResolvedValue(null);

      await expect(service.findOne(BigInt(999))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const existingReq = {
      id: BigInt(1),
      title: 'Original',
      status: RequirementStatus.DRAFT,
      createdBy: BigInt(1),
    };

    it('should update requirement fields', async () => {
      prisma.requirement.findUnique.mockResolvedValue(existingReq);
      prisma.requirement.update.mockResolvedValue({
        ...existingReq,
        title: 'Updated',
      });

      const dto: UpdateRequirementDto = { title: 'Updated' };
      const result = await service.update(BigInt(1), dto);

      expect(result.title).toBe('Updated');
      expect(prisma.requirement.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { title: 'Updated' },
      });
    });

    it('should throw NotFoundException when requirement not found', async () => {
      prisma.requirement.findUnique.mockResolvedValue(null);

      await expect(
        service.update(BigInt(999), { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status transition using state machine', async () => {
      prisma.requirement.findUnique.mockResolvedValue(existingReq);

      const dto: UpdateRequirementDto = {
        status: RequirementStatus.ANALYZING,
      };
      prisma.requirement.update.mockResolvedValue({
        ...existingReq,
        status: RequirementStatus.ANALYZING,
      });

      const result = await service.update(BigInt(1), dto);
      expect(result.status).toBe(RequirementStatus.ANALYZING);
    });

    it('should reject invalid status transition', async () => {
      prisma.requirement.findUnique.mockResolvedValue(existingReq);

      const dto: UpdateRequirementDto = { status: RequirementStatus.CLOSED };

      await expect(service.update(BigInt(1), dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject past due_date on update', async () => {
      prisma.requirement.findUnique.mockResolvedValue(existingReq);

      const dto: UpdateRequirementDto = { due_date: '2020-01-01' };

      await expect(service.update(BigInt(1), dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(BigInt(1), dto)).rejects.toThrow(
        'due_date must be a future date',
      );
    });
  });

  describe('confirmSplit', () => {
    const splitDoneReq = {
      id: BigInt(1),
      title: 'Test Requirement',
      status: RequirementStatus.SPLIT_DONE,
      priority: 2,
      createdBy: BigInt(1),
    };

    const validDto: ConfirmSplitDto = {
      tasks: [
        {
          task_key: 'task-1',
          title: 'Task 1',
          description: 'Description 1',
          estimated_hours: 4,
          acceptance_criteria: 'AC 1',
        },
        {
          task_key: 'task-2',
          title: 'Task 2',
          description: 'Description 2',
          estimated_hours: 8,
          parent_key: 'task-1',
          acceptance_criteria: 'AC 2',
        },
      ],
    };

    it('should persist task tree atomically and return task IDs', async () => {
      prisma.requirement.findUnique.mockResolvedValue(splitDoneReq);

      let taskIdCounter = 100;
      const txMock = {
        task: {
          create: jest.fn().mockImplementation(() => {
            const id = BigInt(taskIdCounter++);
            return Promise.resolve({ id, title: 'Task' });
          }),
        },
        requirement: {
          update: jest.fn().mockResolvedValue({ ...splitDoneReq, status: 'assigned' }),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      const result = await service.confirmSplit(BigInt(1), validDto);

      expect(result.task_ids).toHaveLength(2);
      expect(result.task_ids).toEqual(['100', '101']);
      expect(txMock.task.create).toHaveBeenCalledTimes(2);
      expect(txMock.requirement.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { status: RequirementStatus.ASSIGNED },
      });
    });

    it('should resolve parent_key to parent_task_id', async () => {
      prisma.requirement.findUnique.mockResolvedValue(splitDoneReq);

      const txMock = {
        task: {
          create: jest.fn()
            .mockResolvedValueOnce({ id: BigInt(10), title: 'Task 1' })
            .mockResolvedValueOnce({ id: BigInt(11), title: 'Task 2' }),
        },
        requirement: {
          update: jest.fn().mockResolvedValue({ ...splitDoneReq, status: 'assigned' }),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await service.confirmSplit(BigInt(1), validDto);

      // First task (root) should have null parentTaskId
      expect(txMock.task.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          parentTaskId: null,
          title: 'Task 1',
        }),
      });

      // Second task should have parentTaskId = 10 (resolved from task-1)
      expect(txMock.task.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          parentTaskId: BigInt(10),
          title: 'Task 2',
        }),
      });
    });

    it('should emit task.created outbox events for each task', async () => {
      prisma.requirement.findUnique.mockResolvedValue(splitDoneReq);

      const txMock = {
        task: {
          create: jest.fn()
            .mockResolvedValueOnce({ id: BigInt(10), title: 'Task 1' })
            .mockResolvedValueOnce({ id: BigInt(11), title: 'Task 2' }),
        },
        requirement: {
          update: jest.fn().mockResolvedValue({ ...splitDoneReq, status: 'assigned' }),
        },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await service.confirmSplit(BigInt(1), validDto);

      expect(outboxService.writeEvent).toHaveBeenCalledTimes(2);
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        txMock,
        expect.objectContaining({
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: BigInt(10),
        }),
      );
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        txMock,
        expect.objectContaining({
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: BigInt(11),
        }),
      );
    });

    it('should throw NotFoundException when requirement not found', async () => {
      prisma.requirement.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmSplit(BigInt(999), validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when requirement is not in split_done status', async () => {
      const draftReq = { ...splitDoneReq, status: RequirementStatus.DRAFT };
      prisma.requirement.findUnique.mockResolvedValue(draftReq);

      await expect(
        service.confirmSplit(BigInt(1), validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid parent_key reference', async () => {
      prisma.requirement.findUnique.mockResolvedValue(splitDoneReq);

      const invalidDto: ConfirmSplitDto = {
        tasks: [
          {
            task_key: 'task-1',
            title: 'Task 1',
            parent_key: 'non-existent',
          },
        ],
      };

      const txMock = {
        task: { create: jest.fn() },
        requirement: { update: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await expect(
        service.confirmSplit(BigInt(1), invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for circular dependencies', async () => {
      prisma.requirement.findUnique.mockResolvedValue(splitDoneReq);

      const circularDto: ConfirmSplitDto = {
        tasks: [
          {
            task_key: 'task-a',
            title: 'Task A',
            parent_key: 'task-b',
          },
          {
            task_key: 'task-b',
            title: 'Task B',
            parent_key: 'task-a',
          },
        ],
      };

      const txMock = {
        task: { create: jest.fn() },
        requirement: { update: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (fn: any) => fn(txMock));

      await expect(
        service.confirmSplit(BigInt(1), circularDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmSplit(BigInt(1), circularDto),
      ).rejects.toThrow('Circular dependency');
    });
  });
});
