import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaService } from '../../infra/prisma';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { AiJobType, TaskStatus } from '../../domain/enums';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: jest.Mocked<PrismaService>;
  let aiJobService: jest.Mocked<AiJobService>;

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      memberProfile: {
        findMany: jest.fn(),
      },
    };

    const mockAiJobService = {
      createAndDispatch: jest.fn(),
    };

    const mockOutboxService = {
      writeEvent: jest.fn(),
      writeEventStandalone: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiJobService, useValue: mockAiJobService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    prisma = module.get(PrismaService);
    aiJobService = module.get(AiJobService);
  });

  describe('findAll', () => {
    const mockTaskList = [
      {
        id: BigInt(1),
        requirementId: BigInt(10),
        parentTaskId: null,
        title: 'Task 1',
        description: 'Desc 1',
        priority: 2,
        status: 'todo',
        ownerId: BigInt(100),
        collaboratorIds: null,
        estimatedHours: null,
        actualHours: null,
        progressPercent: null,
        startDate: null,
        dueDate: null,
        completedAt: null,
        riskLevel: null,
        aiReason: null,
        acceptanceCriteria: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    it('should return paginated task list with default pagination', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTaskList);
      (prisma.task.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toEqual({
        list: mockTaskList,
        pagination: { page: 1, page_size: 20, total: 1 },
      });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by requirement_id', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTaskList);
      (prisma.task.count as jest.Mock).mockResolvedValue(1);

      await service.findAll({ requirement_id: 10 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requirementId: BigInt(10) },
        }),
      );
    });

    it('should filter by owner_id', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTaskList);
      (prisma.task.count as jest.Mock).mockResolvedValue(1);

      await service.findAll({ owner_id: 100 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: BigInt(100) },
        }),
      );
    });

    it('should filter by status', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: TaskStatus.DOING });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'doing' },
        }),
      );
    });

    it('should apply multiple filters together', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        requirement_id: 10,
        owner_id: 100,
        status: TaskStatus.TODO,
      });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requirementId: BigInt(10),
            ownerId: BigInt(100),
            status: 'todo',
          },
        }),
      );
    });

    it('should respect custom page and page_size', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.count as jest.Mock).mockResolvedValue(50);

      const result = await service.findAll({ page: 3, page_size: 10 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.pagination).toEqual({ page: 3, page_size: 10, total: 50 });
    });
  });

  describe('findOne', () => {
    it('should return task with status logs', async () => {
      const mockTask = {
        id: BigInt(1),
        title: 'Task 1',
        status: 'doing',
        statusLogs: [
          { id: BigInt(2), status: 'doing', createdAt: new Date('2024-01-02') },
          { id: BigInt(1), status: 'todo', createdAt: new Date('2024-01-01') },
        ],
      };
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(mockTask);

      const result = await service.findOne(BigInt(1));

      expect(result).toEqual(mockTask);
      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        include: {
          statusLogs: { orderBy: { createdAt: 'desc' } },
        },
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(BigInt(999))).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suggestAssignment', () => {
    const mockTasks = [
      {
        id: BigInt(1),
        title: 'Task 1',
        description: 'Description 1',
        priority: 2,
        estimatedHours: { toString: () => '8.00' },
        status: 'todo',
        requirementId: BigInt(10),
        parentTaskId: null,
        ownerId: null,
        collaboratorIds: null,
        actualHours: null,
        progressPercent: { toString: () => '0.00' },
        startDate: null,
        dueDate: null,
        completedAt: null,
        riskLevel: null,
        aiReason: null,
        acceptanceCriteria: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: BigInt(2),
        title: 'Task 2',
        description: 'Description 2',
        priority: 1,
        estimatedHours: null,
        status: 'todo',
        requirementId: BigInt(10),
        parentTaskId: null,
        ownerId: null,
        collaboratorIds: null,
        actualHours: null,
        progressPercent: { toString: () => '0.00' },
        startDate: null,
        dueDate: null,
        completedAt: null,
        riskLevel: null,
        aiReason: null,
        acceptanceCriteria: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockMembers = [
      {
        id: BigInt(1),
        userId: BigInt(100),
        skillTags: ['typescript', 'react'],
        skillLevel: 4,
        currentWorkload: { toString: () => '20.00' },
        availableHoursPerWeek: { toString: () => '40.00' },
        historicalSuccessRate: { toString: () => '0.85' },
        preferredTaskTypes: null,
        avoidTaskTypes: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: BigInt(100),
          name: 'Alice',
          role: 'member',
          status: 'active',
        },
      },
      {
        id: BigInt(2),
        userId: BigInt(101),
        skillTags: ['python', 'backend'],
        skillLevel: 3,
        currentWorkload: { toString: () => '30.00' },
        availableHoursPerWeek: { toString: () => '35.00' },
        historicalSuccessRate: { toString: () => '0.90' },
        preferredTaskTypes: null,
        avoidTaskTypes: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: BigInt(101),
          name: 'Bob',
          role: 'member',
          status: 'active',
        },
      },
    ];

    it('should create an AI job and return job_id', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.memberProfile.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (aiJobService.createAndDispatch as jest.Mock).mockResolvedValue('42');

      const result = await service.suggestAssignment([1, 2], BigInt(5));

      expect(result).toEqual({ job_id: '42' });
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { id: { in: [BigInt(1), BigInt(2)] } },
      });
      expect(prisma.memberProfile.findMany).toHaveBeenCalledWith({
        where: { user: { status: 'active' } },
        include: {
          user: { select: { id: true, name: true, role: true, status: true } },
        },
      });
      expect(aiJobService.createAndDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: AiJobType.ASSIGNMENT_SUGGEST,
          createdBy: BigInt(5),
          inputPayload: {
            tasks: [
              {
                id: '1',
                title: 'Task 1',
                description: 'Description 1',
                priority: 2,
                estimatedHours: '8.00',
                status: 'todo',
                requirementId: '10',
              },
              {
                id: '2',
                title: 'Task 2',
                description: 'Description 2',
                priority: 1,
                estimatedHours: null,
                status: 'todo',
                requirementId: '10',
              },
            ],
            members: [
              {
                userId: '100',
                name: 'Alice',
                skillTags: ['typescript', 'react'],
                skillLevel: 4,
                currentWorkload: '20.00',
                availableHoursPerWeek: '40.00',
                historicalSuccessRate: '0.85',
              },
              {
                userId: '101',
                name: 'Bob',
                skillTags: ['python', 'backend'],
                skillLevel: 3,
                currentWorkload: '30.00',
                availableHoursPerWeek: '35.00',
                historicalSuccessRate: '0.90',
              },
            ],
          },
        }),
      );
    });

    it('should throw NotFoundException when no tasks found', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.suggestAssignment([999], BigInt(5)),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include a requestId (UUID) in the AI job creation', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.memberProfile.findMany as jest.Mock).mockResolvedValue(mockMembers);
      (aiJobService.createAndDispatch as jest.Mock).mockResolvedValue('99');

      await service.suggestAssignment([1], BigInt(5));

      const callArgs = (aiJobService.createAndDispatch as jest.Mock).mock.calls[0][0];
      expect(callArgs.requestId).toBeDefined();
      // UUID v4 format check
      expect(callArgs.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should work with empty member profiles', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
      (prisma.memberProfile.findMany as jest.Mock).mockResolvedValue([]);
      (aiJobService.createAndDispatch as jest.Mock).mockResolvedValue('55');

      const result = await service.suggestAssignment([1, 2], BigInt(5));

      expect(result).toEqual({ job_id: '55' });
      const callArgs = (aiJobService.createAndDispatch as jest.Mock).mock.calls[0][0];
      expect(callArgs.inputPayload.members).toEqual([]);
    });
  });

  describe('assignTasks', () => {
    let mockTx: any;
    let outboxService: jest.Mocked<OutboxService>;

    beforeEach(() => {
      mockTx = {
        user: {
          findMany: jest.fn(),
        },
        task: {
          findMany: jest.fn(),
          update: jest.fn(),
        },
        notification: {
          create: jest.fn(),
        },
      };

      // Make prisma.$transaction execute the callback with mockTx
      (prisma as any).$transaction = jest.fn((cb: any) => cb(mockTx));

      outboxService = (service as any).outboxService;
    });

    it('should assign tasks and return assigned_count and task_ids', async () => {
      mockTx.user.findMany.mockResolvedValue([
        { id: BigInt(100) },
        { id: BigInt(101) },
      ]);
      mockTx.task.findMany.mockResolvedValue([
        { id: BigInt(1) },
        { id: BigInt(2) },
      ]);
      mockTx.task.update.mockResolvedValue({});
      mockTx.notification.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      const result = await service.assignTasks([
        { task_id: 1, member_id: 100 },
        { task_id: 2, member_id: 101 },
      ]);

      expect(result).toEqual({ assigned_count: 2, task_ids: [1, 2] });
      expect(mockTx.task.update).toHaveBeenCalledTimes(2);
      expect(mockTx.notification.create).toHaveBeenCalledTimes(2);
      expect(outboxService.writeEvent).toHaveBeenCalledTimes(2);
    });

    it('should reject entire batch if any member is not active', async () => {
      // Only member 100 is active, member 999 does not exist
      mockTx.user.findMany.mockResolvedValue([{ id: BigInt(100) }]);

      await expect(
        service.assignTasks([
          { task_id: 1, member_id: 100 },
          { task_id: 2, member_id: 999 },
        ]),
      ).rejects.toThrow('Member with id 999 does not exist or is not active');
    });

    it('should reject entire batch if any task does not exist', async () => {
      mockTx.user.findMany.mockResolvedValue([{ id: BigInt(100) }]);
      mockTx.task.findMany.mockResolvedValue([{ id: BigInt(1) }]);

      await expect(
        service.assignTasks([
          { task_id: 1, member_id: 100 },
          { task_id: 999, member_id: 100 },
        ]),
      ).rejects.toThrow('Task with id 999 does not exist');
    });

    it('should set task status to todo and record assignment timestamp', async () => {
      mockTx.user.findMany.mockResolvedValue([{ id: BigInt(100) }]);
      mockTx.task.findMany.mockResolvedValue([{ id: BigInt(1) }]);
      mockTx.task.update.mockResolvedValue({});
      mockTx.notification.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.assignTasks([{ task_id: 1, member_id: 100 }]);

      expect(mockTx.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(1) },
          data: expect.objectContaining({
            ownerId: BigInt(100),
            status: 'todo',
          }),
        }),
      );
    });

    it('should create notification for each assigned member', async () => {
      mockTx.user.findMany.mockResolvedValue([{ id: BigInt(100) }]);
      mockTx.task.findMany.mockResolvedValue([{ id: BigInt(1) }]);
      mockTx.task.update.mockResolvedValue({});
      mockTx.notification.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.assignTasks([{ task_id: 1, member_id: 100 }]);

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          receiverId: BigInt(100),
          notificationType: 'task_assigned',
          refType: 'task',
          refId: BigInt(1),
        }),
      });
    });

    it('should emit task.assigned outbox events', async () => {
      mockTx.user.findMany.mockResolvedValue([{ id: BigInt(100) }]);
      mockTx.task.findMany.mockResolvedValue([{ id: BigInt(1) }]);
      mockTx.task.update.mockResolvedValue({});
      mockTx.notification.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.assignTasks([{ task_id: 1, member_id: 100 }]);

      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: 'task.assigned',
          aggregateType: 'task',
          aggregateId: BigInt(1),
          payload: expect.objectContaining({
            task_id: 1,
            member_id: 100,
          }),
        }),
      );
    });
  });

  describe('updateTaskStatus', () => {
    let mockTx: any;
    let outboxService: jest.Mocked<OutboxService>;

    const mockTask = {
      id: BigInt(1),
      title: 'Test Task',
      status: 'todo',
      ownerId: BigInt(10),
      updatedAt: new Date('2025-01-01'),
    };

    beforeEach(() => {
      mockTx = {
        task: {
          update: jest.fn(),
        },
        taskStatusLog: {
          create: jest.fn(),
        },
      };

      (prisma as any).$transaction = jest.fn((cb: any) => cb(mockTx));
      (prisma as any).task = {
        ...((prisma as any).task || {}),
        findUnique: jest.fn(),
      };

      outboxService = (service as any).outboxService;
    });

    it('should update task status from todo to doing', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);
      mockTx.task.update.mockResolvedValue({ ...mockTask, status: 'doing', updatedAt: new Date('2025-01-02') });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      const result = await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.DOING,
        BigInt(10),
        'member',
      );

      expect(result.task_id).toBe('1');
      expect(result.previous_status).toBe('todo');
      expect(result.current_status).toBe('doing');
    });

    it('should throw NotFoundException if task does not exist', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTaskStatus(BigInt(999), TaskStatus.DOING, BigInt(10), 'member'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner, manager, or admin', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateTaskStatus(BigInt(1), TaskStatus.DOING, BigInt(99), 'member'),
      ).rejects.toThrow('Only the task owner, a manager, or an admin can update task status');
    });

    it('should allow manager to update any task status', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);
      mockTx.task.update.mockResolvedValue({ ...mockTask, status: 'doing', updatedAt: new Date() });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      const result = await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.DOING,
        BigInt(99),
        'manager',
      );

      expect(result.current_status).toBe('doing');
    });

    it('should reject same status repeated submission (deduplication)', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateTaskStatus(BigInt(1), TaskStatus.TODO, BigInt(10), 'member'),
      ).rejects.toThrow('Task is already in "todo" status');
    });

    it('should reject invalid state transition', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.updateTaskStatus(BigInt(1), TaskStatus.DONE, BigInt(10), 'member'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to force-close todo → done', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);
      mockTx.task.update.mockResolvedValue({ ...mockTask, status: 'done', updatedAt: new Date(), completedAt: new Date() });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      const result = await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.DONE,
        BigInt(10),
        'admin',
      );

      expect(result.current_status).toBe('done');
    });

    it('should emit task.blocked event when transitioning to blocked', async () => {
      const doingTask = { ...mockTask, status: 'doing' };
      (prisma as any).task.findUnique.mockResolvedValue(doingTask);
      mockTx.task.update.mockResolvedValue({ ...doingTask, status: 'blocked', updatedAt: new Date() });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.BLOCKED,
        BigInt(10),
        'member',
        { blocked_reason: 'Waiting for API' },
      );

      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ eventType: 'task.status_changed' }),
      );
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ eventType: 'task.blocked' }),
      );
    });

    it('should emit task.done event when transitioning to done', async () => {
      const doingTask = { ...mockTask, status: 'doing' };
      (prisma as any).task.findUnique.mockResolvedValue(doingTask);
      mockTx.task.update.mockResolvedValue({ ...doingTask, status: 'done', updatedAt: new Date(), completedAt: new Date() });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.DONE,
        BigInt(10),
        'member',
      );

      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ eventType: 'task.status_changed' }),
      );
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ eventType: 'task.done' }),
      );
    });

    it('should create TaskStatusLog atomically within transaction', async () => {
      (prisma as any).task.findUnique.mockResolvedValue(mockTask);
      mockTx.task.update.mockResolvedValue({ ...mockTask, status: 'doing', updatedAt: new Date() });
      mockTx.taskStatusLog.create.mockResolvedValue({});
      outboxService.writeEvent = jest.fn().mockResolvedValue({});

      await service.updateTaskStatus(
        BigInt(1),
        TaskStatus.DOING,
        BigInt(10),
        'member',
        { note: 'Starting work', progress: 10 },
      );

      expect(mockTx.taskStatusLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: BigInt(1),
          status: 'doing',
          note: 'Starting work',
          progressPercent: 10,
          sourceType: 'manual',
          createdBy: BigInt(10),
        }),
      });
    });

    it('should require blocked_reason when transitioning to blocked', async () => {
      const doingTask = { ...mockTask, status: 'doing' };
      (prisma as any).task.findUnique.mockResolvedValue(doingTask);

      await expect(
        service.updateTaskStatus(BigInt(1), TaskStatus.BLOCKED, BigInt(10), 'member'),
      ).rejects.toThrow('Transition to "blocked" requires a blocked_reason');
    });
  });
});
