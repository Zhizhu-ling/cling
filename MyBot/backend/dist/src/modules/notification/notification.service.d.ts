import { PrismaService } from '../../infra/prisma';
import { OutboxService } from '../outbox/outbox.service';
import { PaginatedList } from '../../common/interfaces';
import { NotificationQueryDto } from './dto';
import type { Notification } from '@prisma/client';
export interface CreateNotificationData {
    receiverId: bigint;
    notificationType: string;
    title: string;
    content?: string;
    refType?: string;
    refId?: bigint;
}
export declare class NotificationService {
    private readonly prisma;
    private readonly outboxService;
    private readonly logger;
    constructor(prisma: PrismaService, outboxService: OutboxService);
    createNotification(data: CreateNotificationData): Promise<Notification>;
    findAll(receiverId: bigint, query: NotificationQueryDto): Promise<PaginatedList<Notification>>;
    markAsRead(notificationId: bigint, receiverId: bigint): Promise<Notification>;
    markAllAsRead(receiverId: bigint): Promise<{
        updated_count: number;
    }>;
}
