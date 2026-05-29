import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../../infra/prisma';

export interface CreateAuditLogDto {
  entityType: string;
  entityId: bigint;
  operation: string;
  operatorId: bigint;
  beforeSnapshot?: Prisma.InputJsonValue | null;
  afterSnapshot?: Prisma.InputJsonValue | null;
  requestId?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        operation: dto.operation,
        operatorId: dto.operatorId,
        beforeSnapshot: dto.beforeSnapshot ?? Prisma.JsonNull,
        afterSnapshot: dto.afterSnapshot ?? Prisma.JsonNull,
        requestId: dto.requestId ?? undefined,
      },
    });
  }
}
