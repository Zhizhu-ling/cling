import { NotificationService } from './notification.service';
import type { JwtPayload } from '../auth/interfaces';
import { NotificationQueryDto } from './dto';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    findAll(query: NotificationQueryDto, user: JwtPayload): Promise<import("../../common").PaginatedList<{
        id: bigint;
        createdAt: Date;
        title: string;
        content: string | null;
        notificationType: string;
        refType: string | null;
        refId: bigint | null;
        isRead: boolean;
        readAt: Date | null;
        receiverId: bigint;
    }>>;
    markAsRead(id: number, user: JwtPayload): Promise<{
        id: bigint;
        createdAt: Date;
        title: string;
        content: string | null;
        notificationType: string;
        refType: string | null;
        refId: bigint | null;
        isRead: boolean;
        readAt: Date | null;
        receiverId: bigint;
    }>;
    markAllAsRead(user: JwtPayload): Promise<{
        updated_count: number;
    }>;
}
