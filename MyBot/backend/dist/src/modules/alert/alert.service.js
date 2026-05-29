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
var AlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_1 = require("../../infra/prisma");
const outbox_service_1 = require("../outbox/outbox.service");
const event_types_1 = require("../../events/event-types");
const alert_type_enum_1 = require("../../domain/enums/alert-type.enum");
const task_status_enum_1 = require("../../domain/enums/task-status.enum");
const DEDUP_THRESHOLD_HOURS = 24;
const BLOCKED_THRESHOLD_HOURS = 24;
const DETECTION_INTERVAL_MS = 5 * 60 * 1000;
let AlertService = AlertService_1 = class AlertService {
    prisma;
    outboxService;
    logger = new common_1.Logger(AlertService_1.name);
    constructor(prisma, outboxService) {
        this.prisma = prisma;
        this.outboxService = outboxService;
    }
    async runDetection() {
        this.logger.log('Running alert detection cycle...');
        try {
            await this.detectDelayedTasks();
            await this.detectBlockedTasks();
            await this.detectOverloadedMembers();
            this.logger.log('Alert detection cycle completed.');
        }
        catch (error) {
            this.logger.error('Alert detection cycle failed', error);
        }
    }
    async detectDelayedTasks() {
        const now = new Date();
        const overdueTasks = await this.prisma.task.findMany({
            where: {
                dueDate: { lt: now },
                status: { not: task_status_enum_1.TaskStatus.DONE },
            },
            include: {
                owner: { select: { id: true, name: true } },
                requirement: { select: { id: true, title: true } },
            },
        });
        for (const task of overdueTasks) {
            const isDuplicate = await this.isDuplicateAlert(alert_type_enum_1.AlertType.DELAY, task.id, null);
            if (isDuplicate) {
                continue;
            }
            const daysOverdue = Math.ceil((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const severity = this.calculateDelaySeverity(daysOverdue);
            await this.createAlertWithOutbox({
                taskId: task.id,
                requirementId: task.requirementId,
                alertType: alert_type_enum_1.AlertType.DELAY,
                severity,
                title: `任务逾期: ${task.title}`,
                description: `任务「${task.title}」已逾期 ${daysOverdue} 天，负责人: ${task.owner?.name ?? '未分配'}`,
                suggestion: `请联系负责人确认进度，或考虑调整截止日期。`,
            });
        }
    }
    async detectBlockedTasks() {
        const thresholdTime = new Date(Date.now() - BLOCKED_THRESHOLD_HOURS * 60 * 60 * 1000);
        const blockedTasks = await this.prisma.task.findMany({
            where: {
                status: task_status_enum_1.TaskStatus.BLOCKED,
            },
            include: {
                owner: { select: { id: true, name: true } },
                requirement: { select: { id: true, title: true } },
                statusLogs: {
                    where: { status: task_status_enum_1.TaskStatus.BLOCKED },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        for (const task of blockedTasks) {
            const lastBlockedLog = task.statusLogs[0];
            if (!lastBlockedLog) {
                continue;
            }
            if (lastBlockedLog.createdAt > thresholdTime) {
                continue;
            }
            const isDuplicate = await this.isDuplicateAlert(alert_type_enum_1.AlertType.BLOCKED, task.id, null);
            if (isDuplicate) {
                continue;
            }
            const hoursBlocked = Math.ceil((Date.now() - lastBlockedLog.createdAt.getTime()) / (1000 * 60 * 60));
            await this.createAlertWithOutbox({
                taskId: task.id,
                requirementId: task.requirementId,
                alertType: alert_type_enum_1.AlertType.BLOCKED,
                severity: alert_type_enum_1.AlertSeverity.HIGH,
                title: `任务阻塞超过24小时: ${task.title}`,
                description: `任务「${task.title}」已被阻塞 ${hoursBlocked} 小时，原因: ${lastBlockedLog.blockedReason ?? '未说明'}`,
                suggestion: `请协调资源解除阻塞，或重新评估任务依赖关系。`,
            });
        }
    }
    async detectOverloadedMembers() {
        const overloadedMembers = await this.prisma.memberProfile.findMany({
            where: {
                currentWorkload: { not: null },
                availableHoursPerWeek: { not: null },
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });
        for (const profile of overloadedMembers) {
            const workload = Number(profile.currentWorkload);
            const available = Number(profile.availableHoursPerWeek);
            if (workload <= available) {
                continue;
            }
            const isDuplicate = await this.isDuplicateOverloadAlert(profile.userId);
            if (isDuplicate) {
                continue;
            }
            const overloadPercent = Math.round(((workload - available) / available) * 100);
            await this.createAlertWithOutbox({
                taskId: null,
                requirementId: null,
                alertType: alert_type_enum_1.AlertType.OVERLOAD,
                severity: overloadPercent > 50 ? alert_type_enum_1.AlertSeverity.HIGH : alert_type_enum_1.AlertSeverity.MEDIUM,
                title: `成员工作量超载: ${profile.user.name}`,
                description: `成员「${profile.user.name}」(ID:${profile.userId}) 当前工作量 ${workload}h 超出可用时间 ${available}h/周，超载 ${overloadPercent}%`,
                suggestion: `建议重新分配部分任务，或与成员沟通调整工作安排。`,
            });
        }
    }
    async resolveAlert(alertId) {
        await this.prisma.alert.update({
            where: { id: alertId },
            data: {
                status: 'resolved',
                resolvedAt: new Date(),
            },
        });
    }
    async isDuplicateAlert(alertType, taskId, requirementId) {
        const thresholdDate = new Date(Date.now() - DEDUP_THRESHOLD_HOURS * 60 * 60 * 1000);
        const existing = await this.prisma.alert.findFirst({
            where: {
                alertType,
                taskId,
                requirementId,
                status: 'open',
                createdAt: { gte: thresholdDate },
            },
        });
        return existing !== null;
    }
    async isDuplicateOverloadAlert(userId) {
        const thresholdDate = new Date(Date.now() - DEDUP_THRESHOLD_HOURS * 60 * 60 * 1000);
        const existing = await this.prisma.alert.findFirst({
            where: {
                alertType: alert_type_enum_1.AlertType.OVERLOAD,
                status: 'open',
                createdAt: { gte: thresholdDate },
                description: { contains: `(ID:${userId})` },
            },
        });
        return existing !== null;
    }
    async createAlertWithOutbox(params) {
        await this.prisma.$transaction(async (tx) => {
            const alert = await tx.alert.create({
                data: {
                    taskId: params.taskId,
                    requirementId: params.requirementId,
                    alertType: params.alertType,
                    severity: params.severity,
                    title: params.title,
                    description: params.description,
                    suggestion: params.suggestion,
                    status: 'open',
                },
            });
            await this.outboxService.writeEvent(tx, {
                eventType: event_types_1.EventTypes.ALERT_CREATED,
                aggregateType: 'alert',
                aggregateId: alert.id,
                payload: {
                    alert_id: alert.id.toString(),
                    alert_type: params.alertType,
                    severity: params.severity,
                    title: params.title,
                    task_id: params.taskId?.toString() ?? null,
                    requirement_id: params.requirementId?.toString() ?? null,
                    created_at: new Date().toISOString(),
                },
            });
            this.logger.log(`Alert created: type=${params.alertType}, title="${params.title}"`);
        });
    }
    calculateDelaySeverity(daysOverdue) {
        if (daysOverdue >= 7)
            return alert_type_enum_1.AlertSeverity.CRITICAL;
        if (daysOverdue >= 3)
            return alert_type_enum_1.AlertSeverity.HIGH;
        if (daysOverdue >= 1)
            return alert_type_enum_1.AlertSeverity.MEDIUM;
        return alert_type_enum_1.AlertSeverity.LOW;
    }
};
exports.AlertService = AlertService;
__decorate([
    (0, schedule_1.Interval)(DETECTION_INTERVAL_MS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AlertService.prototype, "runDetection", null);
exports.AlertService = AlertService = AlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        outbox_service_1.OutboxService])
], AlertService);
//# sourceMappingURL=alert.service.js.map