import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, CreateAuditLogDto } from './audit.service';
import { PrismaService } from '../../infra/prisma';
import { Prisma } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrisma = {
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create an audit log entry with all fields', async () => {
      const dto: CreateAuditLogDto = {
        entityType: 'task',
        entityId: BigInt(1),
        operation: 'status_change',
        operatorId: BigInt(10),
        beforeSnapshot: { status: 'todo' },
        afterSnapshot: { status: 'doing' },
        requestId: 'req-uuid-123',
      };

      const expectedResult = {
        id: BigInt(1),
        entityType: 'task',
        entityId: BigInt(1),
        operation: 'status_change',
        operatorId: BigInt(10),
        beforeSnapshot: { status: 'todo' },
        afterSnapshot: { status: 'doing' },
        requestId: 'req-uuid-123',
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'task',
          entityId: BigInt(1),
          operation: 'status_change',
          operatorId: BigInt(10),
          beforeSnapshot: { status: 'todo' },
          afterSnapshot: { status: 'doing' },
          requestId: 'req-uuid-123',
        },
      });
    });

    it('should create an audit log entry with null snapshots when not provided', async () => {
      const dto: CreateAuditLogDto = {
        entityType: 'user',
        entityId: BigInt(5),
        operation: 'role_change',
        operatorId: BigInt(1),
      };

      const expectedResult = {
        id: BigInt(2),
        entityType: 'user',
        entityId: BigInt(5),
        operation: 'role_change',
        operatorId: BigInt(1),
        beforeSnapshot: null,
        afterSnapshot: null,
        requestId: null,
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: 'user',
          entityId: BigInt(5),
          operation: 'role_change',
          operatorId: BigInt(1),
          beforeSnapshot: Prisma.JsonNull,
          afterSnapshot: Prisma.JsonNull,
          requestId: undefined,
        },
      });
    });

    it('should handle task assignment audit log', async () => {
      const dto: CreateAuditLogDto = {
        entityType: 'task',
        entityId: BigInt(42),
        operation: 'assignment',
        operatorId: BigInt(3),
        beforeSnapshot: { ownerId: null },
        afterSnapshot: { ownerId: 7 },
        requestId: 'req-assign-456',
      };

      const expectedResult = {
        id: BigInt(3),
        ...dto,
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('should handle requirement update audit log', async () => {
      const dto: CreateAuditLogDto = {
        entityType: 'requirement',
        entityId: BigInt(10),
        operation: 'update',
        operatorId: BigInt(2),
        beforeSnapshot: { title: 'Old Title', priority: 3 },
        afterSnapshot: { title: 'New Title', priority: 1 },
        requestId: 'req-update-789',
      };

      const expectedResult = {
        id: BigInt(4),
        ...dto,
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.createLog(dto);

      expect(result).toEqual(expectedResult);
    });
  });
});
