import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService, WriteEventData } from './outbox.service';
import { PrismaService } from '../../infra/prisma';

describe('OutboxService', () => {
  let service: OutboxService;
  let prisma: PrismaService;

  const mockPrisma = {
    outboxEvent: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('writeEvent', () => {
    it('should write an outbox event within a transaction context', async () => {
      const mockTx = {
        outboxEvent: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(1),
            eventType: 'task.assigned',
            aggregateType: 'task',
            aggregateId: BigInt(42),
            payload: { ownerId: 5 },
            status: 'pending',
            retryCount: 0,
            createdAt: new Date(),
          }),
        },
      };

      const eventData: WriteEventData = {
        eventType: 'task.assigned',
        aggregateType: 'task',
        aggregateId: 42,
        payload: { ownerId: 5 },
      };

      const result = await service.writeEvent(mockTx as any, eventData);

      expect(mockTx.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'task.assigned',
          aggregateType: 'task',
          aggregateId: BigInt(42),
          payload: { ownerId: 5 },
          status: 'pending',
          retryCount: 0,
        },
      });
      expect(result.id).toBe(BigInt(1));
      expect(result.status).toBe('pending');
    });

    it('should convert number aggregateId to BigInt', async () => {
      const mockTx = {
        outboxEvent: {
          create: jest.fn().mockResolvedValue({
            id: BigInt(2),
            eventType: 'requirement.created',
            aggregateType: 'requirement',
            aggregateId: BigInt(100),
            payload: {},
            status: 'pending',
            retryCount: 0,
            createdAt: new Date(),
          }),
        },
      };

      await service.writeEvent(mockTx as any, {
        eventType: 'requirement.created',
        aggregateType: 'requirement',
        aggregateId: 100,
        payload: {},
      });

      expect(mockTx.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: BigInt(100),
          }),
        }),
      );
    });
  });

  describe('writeEventStandalone', () => {
    it('should write an outbox event using the main prisma client', async () => {
      mockPrisma.outboxEvent.create.mockResolvedValue({
        id: BigInt(3),
        eventType: 'alert.created',
        aggregateType: 'alert',
        aggregateId: BigInt(7),
        payload: { severity: 'high' },
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
      });

      const eventData: WriteEventData = {
        eventType: 'alert.created',
        aggregateType: 'alert',
        aggregateId: 7,
        payload: { severity: 'high' },
      };

      const result = await service.writeEventStandalone(eventData);

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: 'alert.created',
          aggregateType: 'alert',
          aggregateId: BigInt(7),
          payload: { severity: 'high' },
          status: 'pending',
          retryCount: 0,
        },
      });
      expect(result.id).toBe(BigInt(3));
      expect(result.status).toBe('pending');
    });
  });
});
