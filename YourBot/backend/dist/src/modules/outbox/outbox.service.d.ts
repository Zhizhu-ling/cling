import { PrismaService } from '../../infra/prisma';
export interface WriteEventData {
    eventType: string;
    aggregateType: string;
    aggregateId: bigint | number;
    payload: Record<string, unknown>;
}
export declare class OutboxService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    writeEvent(tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0], data: WriteEventData): Promise<{
        id: bigint;
        status: string;
        createdAt: Date;
        retryCount: number;
        eventType: string;
        aggregateType: string;
        aggregateId: bigint;
        payload: import("@prisma/client/runtime/client").JsonValue;
        nextRetryAt: Date | null;
        sentAt: Date | null;
    }>;
    writeEventStandalone(data: WriteEventData): Promise<{
        id: bigint;
        status: string;
        createdAt: Date;
        retryCount: number;
        eventType: string;
        aggregateType: string;
        aggregateId: bigint;
        payload: import("@prisma/client/runtime/client").JsonValue;
        nextRetryAt: Date | null;
        sentAt: Date | null;
    }>;
}
