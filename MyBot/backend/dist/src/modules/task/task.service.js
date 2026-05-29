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
exports.TaskService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const prisma_1 = require("../../infra/prisma");
const enums_1 = require("../../domain/enums");
const state_machines_1 = require("../../domain/state-machines");
const ai_job_service_1 = require("../ai/ai-job.service");
const outbox_service_1 = require("../outbox/outbox.service");
const events_1 = require("../../events");
const interfaces_1 = require("../../common/interfaces");
let TaskService = class TaskService {
    prisma;
    aiJobService;
    outboxService;
    taskStateMachine = new state_machines_1.TaskStateMachine();
    constructor(prisma, aiJobService, outboxService) {
        this.prisma = prisma;
        this.aiJobService = aiJobService;
        this.outboxService = outboxService;
    }
    async findAll(query) {
        const { page, page_size } = (0, interfaces_1.normalizePagination)(query);
        const where = {};
        if (query.requirement_id) {
            where.requirementId = BigInt(query.requirement_id);
        }
        if (query.owner_id) {
            where.ownerId = BigInt(query.owner_id);
        }
        if (query.status) {
            where.status = query.status;
        }
        const [list, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * page_size,
                take: page_size,
            }),
            this.prisma.task.count({ where }),
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
    async findOne(id) {
        const task = await this.prisma.task.findUnique({
            where: { id },
            include: {
                statusLogs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!task) {
            throw new common_1.NotFoundException(`Task with id ${id} not found`);
        }
        return task;
    }
    async suggestAssignment(taskIds, userId) {
        const tasks = await this.prisma.task.findMany({
            where: {
                id: { in: taskIds.map((id) => BigInt(id)) },
            },
        });
        if (tasks.length === 0) {
            throw new common_1.NotFoundException('No tasks found for the provided task_ids');
        }
        const members = await this.prisma.memberProfile.findMany({
            where: {
                user: {
                    status: 'active',
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });
        const taskInfo = tasks.map((task) => ({
            id: task.id.toString(),
            title: task.title,
            description: task.description,
            priority: task.priority,
            estimatedHours: task.estimatedHours?.toString() ?? null,
            status: task.status,
            requirementId: task.requirementId.toString(),
        }));
        const memberProfiles = members.map((profile) => ({
            userId: profile.userId.toString(),
            name: profile.user.name,
            skillTags: profile.skillTags,
            skillLevel: profile.skillLevel,
            currentWorkload: profile.currentWorkload?.toString() ?? null,
            availableHoursPerWeek: profile.availableHoursPerWeek?.toString() ?? null,
            historicalSuccessRate: profile.historicalSuccessRate?.toString() ?? null,
        }));
        const jobId = await this.aiJobService.createAndDispatch({
            jobType: enums_1.AiJobType.ASSIGNMENT_SUGGEST,
            inputPayload: {
                tasks: taskInfo,
                members: memberProfiles,
            },
            createdBy: userId,
            requestId: (0, uuid_1.v4)(),
        });
        return { job_id: jobId };
    }
    async assignTasks(assignments) {
        const memberIds = [
            ...new Set(assignments.map((a) => BigInt(a.member_id))),
        ];
        const taskIds = assignments.map((a) => BigInt(a.task_id));
        const result = await this.prisma.$transaction(async (tx) => {
            const activeMembers = await tx.user.findMany({
                where: {
                    id: { in: memberIds },
                    status: 'active',
                },
                select: { id: true },
            });
            const activeMemberIdSet = new Set(activeMembers.map((m) => m.id.toString()));
            for (const memberId of memberIds) {
                if (!activeMemberIdSet.has(memberId.toString())) {
                    throw new common_1.BadRequestException(`Member with id ${memberId} does not exist or is not active`);
                }
            }
            const existingTasks = await tx.task.findMany({
                where: { id: { in: taskIds } },
                select: { id: true },
            });
            const existingTaskIdSet = new Set(existingTasks.map((t) => t.id.toString()));
            for (const taskId of taskIds) {
                if (!existingTaskIdSet.has(taskId.toString())) {
                    throw new common_1.NotFoundException(`Task with id ${taskId} does not exist`);
                }
            }
            const now = new Date();
            const assignedTaskIds = [];
            for (const assignment of assignments) {
                const taskId = BigInt(assignment.task_id);
                const memberId = BigInt(assignment.member_id);
                await tx.task.update({
                    where: { id: taskId },
                    data: {
                        ownerId: memberId,
                        status: 'todo',
                        startDate: now,
                        updatedAt: now,
                    },
                });
                await tx.notification.create({
                    data: {
                        receiverId: memberId,
                        notificationType: 'task_assigned',
                        title: `You have been assigned a new task`,
                        content: `Task #${assignment.task_id} has been assigned to you.`,
                        refType: 'task',
                        refId: taskId,
                    },
                });
                await this.outboxService.writeEvent(tx, {
                    eventType: events_1.EventTypes.TASK_ASSIGNED,
                    aggregateType: 'task',
                    aggregateId: taskId,
                    payload: {
                        task_id: assignment.task_id,
                        member_id: assignment.member_id,
                        assigned_at: now.toISOString(),
                    },
                });
                assignedTaskIds.push(assignment.task_id);
            }
            return { assigned_count: assignedTaskIds.length, task_ids: assignedTaskIds };
        });
        return result;
    }
    async updateTaskStatus(taskId, newStatus, userId, userRole, options) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException(`Task with id ${taskId} does not exist`);
        }
        const isOwner = task.ownerId !== null && task.ownerId === userId;
        const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';
        if (!isOwner && !isManagerOrAdmin) {
            throw new common_1.ForbiddenException('Only the task owner, a manager, or an admin can update task status');
        }
        const currentStatus = task.status;
        if (currentStatus === newStatus) {
            throw new common_1.BadRequestException(`Task is already in "${newStatus}" status`);
        }
        const isAdmin = userRole === 'admin';
        const transitionResult = this.taskStateMachine.validateTransition(currentStatus, newStatus, {
            isAdmin,
            blockedReason: options?.blocked_reason,
            progress: options?.progress,
        });
        if (!transitionResult.valid) {
            throw new common_1.BadRequestException(transitionResult.error);
        }
        const updateData = {
            status: newStatus,
            updatedAt: new Date(),
        };
        if (transitionResult.sideEffects?.completedAt) {
            updateData.completedAt = transitionResult.sideEffects.completedAt;
        }
        if (transitionResult.sideEffects?.progress !== undefined) {
            updateData.progressPercent = transitionResult.sideEffects.progress;
        }
        if (options?.progress !== undefined &&
            transitionResult.sideEffects?.progress === undefined) {
            updateData.progressPercent = options.progress;
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: updateData,
            });
            await tx.taskStatusLog.create({
                data: {
                    taskId: taskId,
                    status: newStatus,
                    progressPercent: updateData.progressPercent ?? options?.progress ?? null,
                    note: options?.note ?? null,
                    blockedReason: options?.blocked_reason ?? null,
                    sourceType: 'manual',
                    createdBy: userId,
                },
            });
            await this.outboxService.writeEvent(tx, {
                eventType: events_1.EventTypes.TASK_STATUS_CHANGED,
                aggregateType: 'task',
                aggregateId: taskId,
                payload: {
                    task_id: taskId.toString(),
                    previous_status: currentStatus,
                    current_status: newStatus,
                    changed_by: userId.toString(),
                    changed_at: new Date().toISOString(),
                },
            });
            if (newStatus === enums_1.TaskStatus.BLOCKED) {
                await this.outboxService.writeEvent(tx, {
                    eventType: events_1.EventTypes.TASK_BLOCKED,
                    aggregateType: 'task',
                    aggregateId: taskId,
                    payload: {
                        task_id: taskId.toString(),
                        blocked_reason: options?.blocked_reason ?? null,
                        blocked_by: userId.toString(),
                        blocked_at: new Date().toISOString(),
                    },
                });
            }
            if (newStatus === enums_1.TaskStatus.DONE) {
                await this.outboxService.writeEvent(tx, {
                    eventType: events_1.EventTypes.TASK_DONE,
                    aggregateType: 'task',
                    aggregateId: taskId,
                    payload: {
                        task_id: taskId.toString(),
                        completed_by: userId.toString(),
                        completed_at: updatedTask.completedAt?.toISOString() ?? new Date().toISOString(),
                    },
                });
            }
            return updatedTask;
        });
        return {
            task_id: taskId.toString(),
            previous_status: currentStatus,
            current_status: newStatus,
            updated_at: result.updatedAt.toISOString(),
        };
    }
    async getComments(taskId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            throw new common_1.NotFoundException(`Task with id ${taskId} not found`);
        }
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });
        return comments;
    }
    async addComment(taskId, content, authorId) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            throw new common_1.NotFoundException(`Task with id ${taskId} not found`);
        }
        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                content,
                authorId,
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true },
                },
            },
        });
        return comment;
    }
};
exports.TaskService = TaskService;
exports.TaskService = TaskService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        ai_job_service_1.AiJobService,
        outbox_service_1.OutboxService])
], TaskService);
//# sourceMappingURL=task.service.js.map