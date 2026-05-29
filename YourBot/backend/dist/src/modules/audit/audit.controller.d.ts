import { PrismaService } from '../../infra/prisma';
export declare class AuditController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(page?: string, pageSize?: string, entityType?: string, operation?: string): Promise<{
        list: ({
            operator: {
                id: bigint;
                name: string;
            };
        } & {
            id: bigint;
            createdAt: Date;
            requestId: string | null;
            entityType: string;
            entityId: bigint;
            operation: string;
            operatorId: bigint;
            beforeSnapshot: import("@prisma/client/runtime/client").JsonValue | null;
            afterSnapshot: import("@prisma/client/runtime/client").JsonValue | null;
        })[];
        pagination: {
            page: number;
            page_size: number;
            total: number;
        };
    }>;
}
