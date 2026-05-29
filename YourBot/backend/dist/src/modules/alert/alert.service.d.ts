import { PrismaService } from '../../infra/prisma';
import { OutboxService } from '../outbox/outbox.service';
export declare class AlertService {
    private readonly prisma;
    private readonly outboxService;
    private readonly logger;
    constructor(prisma: PrismaService, outboxService: OutboxService);
    runDetection(): Promise<void>;
    detectDelayedTasks(): Promise<void>;
    detectBlockedTasks(): Promise<void>;
    detectOverloadedMembers(): Promise<void>;
    resolveAlert(alertId: bigint): Promise<void>;
    private isDuplicateAlert;
    private isDuplicateOverloadAlert;
    private createAlertWithOutbox;
    private calculateDelaySeverity;
}
