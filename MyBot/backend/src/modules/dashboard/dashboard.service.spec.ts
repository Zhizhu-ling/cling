import { Test, TestingModule } from '@nestjs/testing';
import {
  DashboardService,
  BoardData,
  DashboardOverviewData,
} from './dashboard.service';
import { PrismaService } from '../../infra/prisma';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrisma = {
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    requirement: {
      count: jest.fn(),
    },
    memberProfile: {
      findMany: jest.fn(),
    },
    alert: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getBoard', () => {
    it('should return tasks grouped by status columns', async () => {
      const mockTasks = [
        {
          id: BigInt(1),
          title: 'Task A',
          status: 'todo',
          priority: 2,
          dueDate: new Date('2025-06-01'),
          owner: { name: 'Alice' },
        },
        {
          id: BigInt(2),
          title: 'Task B',
          status: 'doing',
          priority: 1,
          dueDate: new Date('2025-06-15'),
          owner: { name: 'Bob' },
        },
        {
          id: BigInt(3),
          title: 'Task C',
          status: 'blocked',
          priority: 3,
          dueDate: null,
          owner: null,
        },
        {
          id: BigInt(4),
          title: 'Task D',
          status: 'done',
          priority: 4,
          dueDate: new Date('2025-05-20'),
          owner: { name: 'Charlie' },
        },
        {
          id: BigInt(5),
          title: 'Task E',
          status: 'delayed',
          priority: 1,
          dueDate: new Date('2025-05-10'),
          owner: { name: 'Alice' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result: BoardData = await service.getBoard({});

      expect(result.todo).toHaveLength(1);
      expect(result.todo[0]).toEqual({
        id: '1',
        title: 'Task A',
        owner_name: 'Alice',
        priority: 2,
        due_date: new Date('2025-06-01').toISOString(),
        status: 'todo',
      });

      expect(result.doing).toHaveLength(1);
      expect(result.doing[0].title).toBe('Task B');

      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].owner_name).toBeNull();
      expect(result.blocked[0].due_date).toBeNull();

      expect(result.done).toHaveLength(1);
      expect(result.done[0].title).toBe('Task D');

      expect(result.delayed).toHaveLength(1);
      expect(result.delayed[0].title).toBe('Task E');
    });

    it('should return empty columns when no tasks exist', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      const result = await service.getBoard({});

      expect(result).toEqual({
        todo: [],
        doing: [],
        blocked: [],
        done: [],
        delayed: [],
      });
    });

    it('should filter by requirementId when provided', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.getBoard({ requirementId: BigInt(42) });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { requirementId: BigInt(42) },
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by ownerId when provided', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.getBoard({ ownerId: BigInt(7) });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { ownerId: BigInt(7) },
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by both requirementId and ownerId when provided', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.getBoard({ requirementId: BigInt(10), ownerId: BigInt(5) });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { requirementId: BigInt(10), ownerId: BigInt(5) },
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle tasks with unknown status gracefully', async () => {
      const mockTasks = [
        {
          id: BigInt(1),
          title: 'Task X',
          status: 'unknown_status',
          priority: 2,
          dueDate: null,
          owner: { name: 'Alice' },
        },
        {
          id: BigInt(2),
          title: 'Task Y',
          status: 'todo',
          priority: 1,
          dueDate: null,
          owner: { name: 'Bob' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getBoard({});

      // Unknown status tasks are not placed in any column
      expect(result.todo).toHaveLength(1);
      expect(result.doing).toHaveLength(0);
      expect(result.blocked).toHaveLength(0);
      expect(result.done).toHaveLength(0);
      expect(result.delayed).toHaveLength(0);
    });
  });

  describe('getOverview', () => {
    it('should return complete dashboard overview data', async () => {
      mockPrisma.requirement.count.mockResolvedValue(10);
      mockPrisma.task.count
        .mockResolvedValueOnce(5) // active tasks
        .mockResolvedValueOnce(3) // completed tasks
        .mockResolvedValueOnce(2); // overdue tasks
      mockPrisma.task.groupBy.mockResolvedValue([
        { status: 'todo', _count: { id: 4 } },
        { status: 'doing', _count: { id: 3 } },
        { status: 'blocked', _count: { id: 1 } },
        { status: 'done', _count: { id: 3 } },
        { status: 'delayed', _count: { id: 2 } },
      ]);
      mockPrisma.memberProfile.findMany.mockResolvedValue([
        {
          currentWorkload: 30,
          availableHoursPerWeek: 40,
          user: { name: 'Alice', status: 'active' },
        },
        {
          currentWorkload: 20,
          availableHoursPerWeek: 35,
          user: { name: 'Bob', status: 'active' },
        },
      ]);
      mockPrisma.alert.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          alertType: 'delay',
          severity: 'high',
          title: 'Task overdue',
          description: 'Task X is past due date',
          status: 'open',
          createdAt: new Date('2025-06-01T10:00:00Z'),
        },
      ]);

      const result: DashboardOverviewData = await service.getOverview();

      expect(result.overview_cards).toEqual({
        total_requirements: 10,
        active_tasks: 5,
        completed_tasks: 3,
        overdue_tasks: 2,
      });

      expect(result.task_status_distribution).toEqual({
        todo: 4,
        doing: 3,
        blocked: 1,
        done: 3,
        delayed: 2,
      });

      expect(result.member_workload).toHaveLength(2);
      expect(result.member_workload[0]).toEqual({
        member_name: 'Alice',
        current_workload: 30,
        available_hours: 40,
      });

      expect(result.active_alerts).toHaveLength(1);
      expect(result.active_alerts[0]).toEqual({
        id: '1',
        alert_type: 'delay',
        severity: 'high',
        title: 'Task overdue',
        description: 'Task X is past due date',
        status: 'open',
        created_at: new Date('2025-06-01T10:00:00Z').toISOString(),
      });
    });

    it('should return zero counts when no data exists', async () => {
      mockPrisma.requirement.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.memberProfile.findMany.mockResolvedValue([]);
      mockPrisma.alert.findMany.mockResolvedValue([]);

      const result = await service.getOverview();

      expect(result.overview_cards).toEqual({
        total_requirements: 0,
        active_tasks: 0,
        completed_tasks: 0,
        overdue_tasks: 0,
      });

      expect(result.task_status_distribution).toEqual({
        todo: 0,
        doing: 0,
        blocked: 0,
        done: 0,
        delayed: 0,
      });

      expect(result.member_workload).toHaveLength(0);
      expect(result.active_alerts).toHaveLength(0);
    });

    it('should filter out disabled members from workload', async () => {
      mockPrisma.requirement.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.memberProfile.findMany.mockResolvedValue([
        {
          currentWorkload: 30,
          availableHoursPerWeek: 40,
          user: { name: 'Alice', status: 'active' },
        },
        {
          currentWorkload: 10,
          availableHoursPerWeek: 20,
          user: { name: 'Disabled User', status: 'disabled' },
        },
      ]);

      const result = await service.getOverview();

      expect(result.member_workload).toHaveLength(1);
      expect(result.member_workload[0].member_name).toBe('Alice');
    });

    it('should handle null workload values gracefully', async () => {
      mockPrisma.requirement.count.mockResolvedValue(0);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.groupBy.mockResolvedValue([]);
      mockPrisma.alert.findMany.mockResolvedValue([]);
      mockPrisma.memberProfile.findMany.mockResolvedValue([
        {
          currentWorkload: null,
          availableHoursPerWeek: null,
          user: { name: 'New Member', status: 'active' },
        },
      ]);

      const result = await service.getOverview();

      expect(result.member_workload[0]).toEqual({
        member_name: 'New Member',
        current_workload: 0,
        available_hours: 0,
      });
    });
  });
});
