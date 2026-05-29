import { OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infra/prisma';
export declare class OutboxWorker implements OnModuleDestroy {
    private readonly prisma;
    private readonly eventEmitter;
    private readonly logger;
    private isProcessing;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2);
    onModuleDestroy(): void;
    pollAndDispatch(): Promise<void>;
    private processPendingEvents;
    private dispatchEvent;
}
