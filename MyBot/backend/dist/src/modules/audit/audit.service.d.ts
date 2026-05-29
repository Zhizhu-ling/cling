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
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createLog(dto: CreateAuditLogDto): Promise<AuditLog>;
}
