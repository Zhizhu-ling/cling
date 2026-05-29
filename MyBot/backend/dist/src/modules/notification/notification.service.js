"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../infra/prisma");
const outbox_service_1 = require("../outbox/outbox.service");
const event_types_1 = require("../../events/event-types");
const interfaces_1 = require("../../common/interfaces");
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    outboxService;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma, outboxService) {
        this.prisma = prisma;
        this.outboxService = outboxService;
    }
    async createNotification(data) {
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
                eventType: event_types_1.EventTypes.NOTIFICATION_CREATED,
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
        this.logger.log(`Notification created: type=${data.notificationType}, receiver=${data.receiverId}, title="${data.title}"`);
        return notification;
    }
    async findAll(receiverId, query) {
        const { page, page_size } = (0, interfaces_1.normalizePagination)(query);
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
    async markAsRead(notificationId, receiverId) {
        const notification = await this.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with id ${notificationId} not found`);
        }
        if (notification.receiverId !== receiverId) {
            throw new common_1.NotFoundException(`Notification with id ${notificationId} not found`);
        }
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
    async markAllAsRead(receiverId) {
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
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        outbox_service_1.OutboxService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map