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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../infra/prisma");
const enums_1 = require("../../domain/enums");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const [overviewCards, taskStatusDistribution, memberWorkload, activeAlerts,] = await Promise.all([
            this.getOverviewCards(),
            this.getTaskStatusDistribution(),
            this.getMemberWorkload(),
            this.getActiveAlerts(),
        ]);
        return {
            overview_cards: overviewCards,
            task_status_distribution: taskStatusDistribution,
            member_workload: memberWorkload,
            active_alerts: activeAlerts,
        };
    }
    async getOverviewCards() {
        const now = new Date();
        const [totalRequirements, activeTasks, completedTasks, overdueTasks] = await Promise.all([
            this.prisma.requirement.count(),
            this.prisma.task.count({
                where: {
                    status: { in: [enums_1.TaskStatus.TODO, enums_1.TaskStatus.DOING, enums_1.TaskStatus.BLOCKED] },
                },
            }),
            this.prisma.task.count({
                where: { status: enums_1.TaskStatus.DONE },
            }),
            this.prisma.task.count({
                where: {
                    status: { not: enums_1.TaskStatus.DONE },
                    dueDate: { lt: now },
                },
            }),
        ]);
        return {
            total_requirements: totalRequirements,
            active_tasks: activeTasks,
            completed_tasks: completedTasks,
            overdue_tasks: overdueTasks,
        };
    }
    async getTaskStatusDistribution() {
        const statusCounts = await this.prisma.task.groupBy({
            by: ['status'],
            _count: { id: true },
        });
        const distribution = {
            todo: 0,
            doing: 0,
            blocked: 0,
            done: 0,
            delayed: 0,
        };
        for (const item of statusCounts) {
            const status = item.status;
            if (status in distribution) {
                distribution[status] = item._count.id;
            }
        }
        return distribution;
    }
    async getMemberWorkload() {
        const profiles = await this.prisma.memberProfile.findMany({
            include: {
                user: {
                    select: { name: true, status: true },
                },
            },
        });
        return profiles
            .filter((p) => p.user.status === 'active')
            .map((p) => ({
            member_name: p.user.name,
            current_workload: p.currentWorkload ? Number(p.currentWorkload) : 0,
            available_hours: p.availableHoursPerWeek
                ? Number(p.availableHoursPerWeek)
                : 0,
        }));
    }
    async getActiveAlerts() {
        const alerts = await this.prisma.alert.findMany({
            where: { status: 'open' },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return alerts.map((alert) => ({
            id: alert.id.toString(),
            alert_type: alert.alertType,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            status: alert.status,
            created_at: alert.createdAt.toISOString(),
        }));
    }
    async getBoard(filters) {
        const where = {};
        if (filters.requirementId) {
            where.requirementId = filters.requirementId;
        }
        if (filters.ownerId) {
            where.ownerId = filters.ownerId;
        }
        const tasks = await this.prisma.task.findMany({
            where,
            include: {
                owner: {
                    select: { name: true },
                },
                statusLogs: {
                    where: { status: 'blocked' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { blockedReason: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const board = {
            todo: [],
            doing: [],
            blocked: [],
            done: [],
            delayed: [],
        };
        for (const task of tasks) {
            const item = {
                id: task.id.toString(),
                title: task.title,
                owner_name: task.owner?.name ?? null,
                priority: task.priority,
                due_date: task.dueDate ? task.dueDate.toISOString() : null,
                status: task.status,
                blocked_reason: task.statusLogs?.[0]?.blockedReason ?? null,
            };
            const status = task.status;
            if (status in board) {
                board[status].push(item);
            }
        }
        return board;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map