import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { PrismaService } from '../../infra/prisma';
import { OutboxService } from '../outbox/outbox.service';
import { AlertType, AlertSeverity } from '../../domain/enums/alert-type.enum';
import { TaskStatus } from '../../domain/enums/task-status.enum';
import { EventTypes } from '../../events/event-types';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: any;
  let outboxService: any;

  const mockTx = {
    alert: {
      create: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      memberProfile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      alert: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockTx)),
    };

    outboxService = {
      writeEvent: jest.fn().mockResolvedValue({ id: BigInt(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectDelayedTasks', () => {
    it('should create delay alert for overdue tasks', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const overdueTask = {
        id: BigInt(1),
        title: 'Overdue Task',
        status: TaskStatus.DOING,
        dueDate: pastDate,
        requirementId: BigInt(10),
        owner: { id: BigInt(100), name: 'Alice' },
        requirement: { id: BigInt(10), title: 'Req 1' },
      };

      prisma.task.findMany.mockResolvedValue([overdueTask]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(1),
        alertType: AlertType.DELAY,
      });

      await service.detectDelayedTasks();

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dueDate: { lt: expect.any(Date) },
            status: { not: TaskStatus.DONE },
          },
        }),
      );
      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: AlertType.DELAY,
          taskId: BigInt(1),
          requirementId: BigInt(10),
          status: 'open',
        }),
      });
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: EventTypes.ALERT_CREATED,
          aggregateType: 'alert',
        }),
      );
    });

    it('should not create duplicate delay alert for same task', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const overdueTask = {
        id: BigInt(1),
        title: 'Overdue Task',
        status: TaskStatus.DOING,
        dueDate: pastDate,
        requirementId: BigInt(10),
        owner: { id: BigInt(100), name: 'Alice' },
        requirement: { id: BigInt(10), title: 'Req 1' },
      };

      prisma.task.findMany.mockResolvedValue([overdueTask]);
      // Simulate existing open alert
      prisma.alert.findFirst.mockResolvedValue({
        id: BigInt(99),
        alertType: AlertType.DELAY,
        status: 'open',
      });

      await service.detectDelayedTasks();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
      expect(outboxService.writeEvent).not.toHaveBeenCalled();
    });

    it('should not create alert for tasks with status done', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.detectDelayedTasks();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });

    it('should assign critical severity for tasks overdue 7+ days', async () => {
      const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const overdueTask = {
        id: BigInt(1),
        title: 'Very Overdue Task',
        status: TaskStatus.TODO,
        dueDate: pastDate,
        requirementId: BigInt(10),
        owner: { id: BigInt(100), name: 'Bob' },
        requirement: { id: BigInt(10), title: 'Req 1' },
      };

      prisma.task.findMany.mockResolvedValue([overdueTask]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(1),
        alertType: AlertType.DELAY,
      });

      await service.detectDelayedTasks();

      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: AlertSeverity.CRITICAL,
        }),
      });
    });
  });

  describe('detectBlockedTasks', () => {
    it('should create blocked alert for tasks blocked > 24 hours', async () => {
      const blockedSince = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30 hours ago
      const blockedTask = {
        id: BigInt(2),
        title: 'Blocked Task',
        status: TaskStatus.BLOCKED,
        requirementId: BigInt(20),
        owner: { id: BigInt(200), name: 'Charlie' },
        requirement: { id: BigInt(20), title: 'Req 2' },
        statusLogs: [
          {
            id: BigInt(1),
            status: TaskStatus.BLOCKED,
            createdAt: blockedSince,
            blockedReason: 'Waiting for API',
          },
        ],
      };

      prisma.task.findMany.mockResolvedValue([blockedTask]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(2),
        alertType: AlertType.BLOCKED,
      });

      await service.detectBlockedTasks();

      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: AlertType.BLOCKED,
          severity: AlertSeverity.HIGH,
          taskId: BigInt(2),
          requirementId: BigInt(20),
          status: 'open',
        }),
      });
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: EventTypes.ALERT_CREATED,
          aggregateType: 'alert',
        }),
      );
    });

    it('should not create alert for tasks blocked < 24 hours', async () => {
      const blockedSince = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const blockedTask = {
        id: BigInt(2),
        title: 'Recently Blocked',
        status: TaskStatus.BLOCKED,
        requirementId: BigInt(20),
        owner: { id: BigInt(200), name: 'Charlie' },
        requirement: { id: BigInt(20), title: 'Req 2' },
        statusLogs: [
          {
            id: BigInt(1),
            status: TaskStatus.BLOCKED,
            createdAt: blockedSince,
            blockedReason: 'Waiting',
          },
        ],
      };

      prisma.task.findMany.mockResolvedValue([blockedTask]);

      await service.detectBlockedTasks();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });

    it('should not create alert if no status log exists', async () => {
      const blockedTask = {
        id: BigInt(2),
        title: 'Blocked No Log',
        status: TaskStatus.BLOCKED,
        requirementId: BigInt(20),
        owner: { id: BigInt(200), name: 'Charlie' },
        requirement: { id: BigInt(20), title: 'Req 2' },
        statusLogs: [],
      };

      prisma.task.findMany.mockResolvedValue([blockedTask]);

      await service.detectBlockedTasks();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });

    it('should not create duplicate blocked alert', async () => {
      const blockedSince = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const blockedTask = {
        id: BigInt(2),
        title: 'Blocked Task',
        status: TaskStatus.BLOCKED,
        requirementId: BigInt(20),
        owner: { id: BigInt(200), name: 'Charlie' },
        requirement: { id: BigInt(20), title: 'Req 2' },
        statusLogs: [
          {
            id: BigInt(1),
            status: TaskStatus.BLOCKED,
            createdAt: blockedSince,
            blockedReason: 'Waiting',
          },
        ],
      };

      prisma.task.findMany.mockResolvedValue([blockedTask]);
      prisma.alert.findFirst.mockResolvedValue({
        id: BigInt(99),
        alertType: AlertType.BLOCKED,
        status: 'open',
      });

      await service.detectBlockedTasks();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });
  });

  describe('detectOverloadedMembers', () => {
    it('should create overload alert for members exceeding available hours', async () => {
      const overloadedMember = {
        id: BigInt(1),
        userId: BigInt(300),
        currentWorkload: 50.0,
        availableHoursPerWeek: 40.0,
        user: { id: BigInt(300), name: 'Dave' },
      };

      prisma.memberProfile.findMany.mockResolvedValue([overloadedMember]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(3),
        alertType: AlertType.OVERLOAD,
      });

      await service.detectOverloadedMembers();

      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: AlertType.OVERLOAD,
          taskId: null,
          requirementId: null,
          status: 'open',
        }),
      });
      expect(outboxService.writeEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: EventTypes.ALERT_CREATED,
          aggregateType: 'alert',
        }),
      );
    });

    it('should not create alert for members within available hours', async () => {
      const normalMember = {
        id: BigInt(1),
        userId: BigInt(300),
        currentWorkload: 30.0,
        availableHoursPerWeek: 40.0,
        user: { id: BigInt(300), name: 'Eve' },
      };

      prisma.memberProfile.findMany.mockResolvedValue([normalMember]);

      await service.detectOverloadedMembers();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });

    it('should assign high severity for overload > 50%', async () => {
      const heavilyOverloaded = {
        id: BigInt(1),
        userId: BigInt(300),
        currentWorkload: 70.0,
        availableHoursPerWeek: 40.0,
        user: { id: BigInt(300), name: 'Frank' },
      };

      prisma.memberProfile.findMany.mockResolvedValue([heavilyOverloaded]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(3),
        alertType: AlertType.OVERLOAD,
      });

      await service.detectOverloadedMembers();

      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: AlertSeverity.HIGH,
        }),
      });
    });

    it('should assign medium severity for overload <= 50%', async () => {
      const slightlyOverloaded = {
        id: BigInt(1),
        userId: BigInt(300),
        currentWorkload: 45.0,
        availableHoursPerWeek: 40.0,
        user: { id: BigInt(300), name: 'Grace' },
      };

      prisma.memberProfile.findMany.mockResolvedValue([slightlyOverloaded]);
      mockTx.alert.create.mockResolvedValue({
        id: BigInt(3),
        alertType: AlertType.OVERLOAD,
      });

      await service.detectOverloadedMembers();

      expect(mockTx.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: AlertSeverity.MEDIUM,
        }),
      });
    });

    it('should not create duplicate overload alert for same member', async () => {
      const overloadedMember = {
        id: BigInt(1),
        userId: BigInt(300),
        currentWorkload: 50.0,
        availableHoursPerWeek: 40.0,
        user: { id: BigInt(300), name: 'Dave' },
      };

      prisma.memberProfile.findMany.mockResolvedValue([overloadedMember]);
      prisma.alert.findFirst.mockResolvedValue({
        id: BigInt(99),
        alertType: AlertType.OVERLOAD,
        status: 'open',
      });

      await service.detectOverloadedMembers();

      expect(mockTx.alert.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('should update alert status to resolved', async () => {
      prisma.alert.update.mockResolvedValue({
        id: BigInt(1),
        status: 'resolved',
      });

      await service.resolveAlert(BigInt(1));

      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          status: 'resolved',
          resolvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('runDetection', () => {
    it('should call all detection methods', async () => {
      const detectDelayedSpy = jest
        .spyOn(service, 'detectDelayedTasks')
        .mockResolvedValue();
      const detectBlockedSpy = jest
        .spyOn(service, 'detectBlockedTasks')
        .mockResolvedValue();
      const detectOverloadedSpy = jest
        .spyOn(service, 'detectOverloadedMembers')
        .mockResolvedValue();

      await service.runDetection();

      expect(detectDelayedSpy).toHaveBeenCalled();
      expect(detectBlockedSpy).toHaveBeenCalled();
      expect(detectOverloadedSpy).toHaveBeenCalled();
    });

    it('should not throw if detection fails', async () => {
      jest
        .spyOn(service, 'detectDelayedTasks')
        .mockRejectedValue(new Error('DB error'));

      await expect(service.runDetection()).resolves.not.toThrow();
    });
  });
});
