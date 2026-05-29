import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma';
import { OutboxService } from '../outbox/outbox.service';
import { EventTypes } from '../../events/event-types';
import { PaginatedList, normalizePagination } from '../../common/interfaces';
import { NotificationQueryDto } from './dto';
import type { Notification } from '@prisma/client';

/**
 * Data required to create a notification.
 */
export interface CreateNotificationData {
  receiverId: bigint;
  notificationType: string;
  title: string;
  content?: string;
  refType?: string;
  refId?: bigint;
}

/**
 * NotificationService handles notification CRUD and event emission.
 * Validates: Requirements 5.2
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Create a notification and emit notification.created event via outbox.
   * Used when: task assignment, alert creation, AI job completion.
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.notification.create({
        data: {
          receiverId: data.receiverId,
          notificationType: data.notificationType,
          title: data.title,
          content: data.content ?? null,
          refType: data.refType ?? null,
          refId: data.refId ?? null,
          isRead: false,
        },
      });

      await this.outboxService.writeEvent(tx, {
        eventType: EventTypes.NOTIFICATION_CREATED,
        aggregateType: 'notification',
        aggregateId: created.id,
        payload: {
          notification_id: created.id.toString(),
          receiver_id: data.receiverId.toString(),
          notification_type: data.notificationType,
          title: data.title,
          ref_type: data.refType ?? null,
          ref_id: data.refId?.toString() ?? null,
          created_at: new Date().toISOString(),
        },
      });

      return created;
    });

    this.logger.log(
      `Notification created: type=${data.notificationType}, receiver=${data.receiverId}, title="${data.title}"`,
    );

    return notification;
  }

  /**
   * GET /api/v1/notifications - Paginated notification list for current user.
   * Returns notifications ordered by createdAt desc.
   */
  async findAll(
    receiverId: bigint,
    query: NotificationQueryDto,
  ): Promise<PaginatedList<Notification>> {
    const { page, page_size } = normalizePagination(query);

    const where = { receiverId };

    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page,
        page_size,
        total,
      },
    };
  }

  /**
   * POST /api/v1/notifications/:id/read - Mark a single notification as read.
   * Only the receiver can mark their own notification as read.
   */
  async markAsRead(notificationId: bigint, receiverId: bigint): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id ${notificationId} not found`);
    }

    if (notification.receiverId !== receiverId) {
      throw new NotFoundException(`Notification with id ${notificationId} not found`);
    }

    // Already read, return as-is
    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * POST /api/v1/notifications/read-all - Mark all notifications as read for current user.
   */
  async markAllAsRead(receiverId: bigint): Promise<{ updated_count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        receiverId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated_count: result.count };
  }
}
