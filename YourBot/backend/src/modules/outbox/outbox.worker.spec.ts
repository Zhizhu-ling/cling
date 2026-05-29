import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxWorker } from './outbox.worker';
import { PrismaService } from '../../infra/prisma';

describe('OutboxWorker', () => {
  let worker: OutboxWorker;
  let prisma: any;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    outboxEvent: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorker,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    worker = module.get<OutboxWorker>(OutboxWorker);
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('pollAndDispatch', () => {
    it('should do nothing when no pending events exist', async () => {
      mockPrisma.outboxEvent.findMany.mockResolvedValue([]);

      await worker.pollAndDispatch();

      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should dispatch pending events and mark them as sent', async () => {
      const mockEvent = {
        id: BigInt(1),
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: BigInt(42),
        payload: { ownerId: 5 },
        retryCount: 0,
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.outboxEvent.update.mockResolvedValue({
        ...mockEvent,
        status: 'sent',
        sentAt: new Date(),
      });

      await worker.pollAndDispatch();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.assigned', {
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: BigInt(42),
        payload: { ownerId: 5 },
        outboxEventId: BigInt(1),
      });

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          status: 'sent',
          sentAt: expect.any(Date),
        },
      });
    });

    it('should process multiple events in order', async () => {
      const events = [
        {
          id: BigInt(1),
          eventType: 'task.created',
          aggregateType: 'task',
          aggregateId: BigInt(10),
          payload: {},
          retryCount: 0,
          status: 'pending',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: BigInt(2),
          eventType: 'task.assigned',
          aggregateType: 'task',
          aggregateId: BigInt(10),
          payload: { ownerId: 3 },
          retryCount: 0,
          status: 'pending',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.outboxEvent.findMany.mockResolvedValue(events);
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      await worker.pollAndDispatch();

      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledTimes(2);
    });

    it('should not run concurrently (guard flag)', async () => {
      // Simulate a slow processing cycle
      mockPrisma.outboxEvent.findMany.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      // Start two concurrent polls
      const poll1 = worker.pollAndDispatch();
      const poll2 = worker.pollAndDispatch();

      await Promise.all([poll1, poll2]);

      // findMany should only be called once due to the guard
      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('should increment retry count and set next_retry_at on failure', async () => {
      const mockEvent = {
        id: BigInt(1),
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: BigInt(42),
        payload: { ownerId: 5 },
        retryCount: 0,
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Dispatch failed');
      });
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      await worker.pollAndDispatch();

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          retryCount: 1,
          nextRetryAt: expect.any(Date),
        },
      });
    });

    it('should apply exponential backoff on retries', async () => {
      const mockEvent = {
        id: BigInt(1),
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: BigInt(42),
        payload: {},
        retryCount: 2, // Already retried twice
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Dispatch failed');
      });
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      const beforeTime = Date.now();
      await worker.pollAndDispatch();

      const updateCall = mockPrisma.outboxEvent.update.mock.calls[0][0];
      expect(updateCall.data.retryCount).toBe(3);

      // Backoff for retry 3: 2000 * 2^2 = 8000ms
      const nextRetryAt = updateCall.data.nextRetryAt as Date;
      const backoffMs = nextRetryAt.getTime() - beforeTime;
      // Allow some tolerance for test execution time
      expect(backoffMs).toBeGreaterThanOrEqual(7000);
      expect(backoffMs).toBeLessThan(10000);
    });

    it('should mark event as failed after max retries (5)', async () => {
      const mockEvent = {
        id: BigInt(1),
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: BigInt(42),
        payload: {},
        retryCount: 4, // One more failure will hit max (5)
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockEvent]);
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Dispatch failed');
      });
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      await worker.pollAndDispatch();

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          status: 'failed',
          retryCount: 5,
        },
      });
    });
  });
});
