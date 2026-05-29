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
exports.RequirementService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const prisma_1 = require("../../infra/prisma");
const enums_1 = require("../../domain/enums");
const state_machines_1 = require("../../domain/state-machines");
const interfaces_1 = require("../../common/interfaces");
const ai_job_service_1 = require("../ai/ai-job.service");
const outbox_service_1 = require("../outbox/outbox.service");
const event_types_1 = require("../../events/event-types");
let RequirementService = class RequirementService {
    prisma;
    aiJobService;
    outboxService;
    constructor(prisma, aiJobService, outboxService) {
        this.prisma = prisma;
        this.aiJobService = aiJobService;
        this.outboxService = outboxService;
    }
    async create(dto, userId) {
        const dueDate = new Date(dto.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate <= today) {
            throw new common_1.BadRequestException('due_date must be a future date');
        }
        const requirement = await this.prisma.requirement.create({
            data: {
                title: dto.title,
                background: dto.background,
                objective: dto.objective,
                constraints: dto.constraints || null,
                deliverables: dto.deliverables,
                priority: dto.priority,
                dueDate: dueDate,
                status: enums_1.RequirementStatus.DRAFT,
                createdBy: userId,
                projectId: dto.project_id ? BigInt(dto.project_id) : null,
            },
        });
        return { id: requirement.id, status: requirement.status };
    }
    async findAll(query) {
        const { page, page_size } = (0, interfaces_1.normalizePagination)(query);
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.priority) {
            where.priority = query.priority;
        }
        const orderBy = {};
        const sortField = query.sort_by === 'due_date' ? 'dueDate' : 'createdAt';
        const sortOrder = query.sort_order || 'desc';
        orderBy[sortField] = sortOrder;
        const [list, total] = await Promise.all([
            this.prisma.requirement.findMany({
                where,
                orderBy,
                skip: (page - 1) * page_size,
                take: page_size,
            }),
            this.prisma.requirement.count({ where }),
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
        const requirement = await this.prisma.requirement.findUnique({
            where: { id },
        });
        if (!requirement) {
            throw new common_1.NotFoundException(`Requirement with id ${id} not found`);
        }
        return requirement;
    }
    async splitRequirement(id, userId) {
        const requirement = await this.prisma.requirement.findUnique({
            where: { id },
        });
        if (!requirement) {
            throw new common_1.NotFoundException(`Requirement with id ${id} not found`);
        }
        const currentStatus = requirement.status;
        const transitionResult = state_machines_1.RequirementStateMachine.validateTransition(currentStatus, enums_1.RequirementStatus.ANALYZING);
        if (!transitionResult.valid) {
            throw new common_1.BadRequestException(transitionResult.error ??
                `Cannot split requirement in '${currentStatus}' status. Requirement must be in 'draft' status.`);
        }
        await this.prisma.requirement.update({
            where: { id },
            data: { status: enums_1.RequirementStatus.ANALYZING },
        });
        const jobId = await this.aiJobService.createAndDispatch({
            jobType: enums_1.AiJobType.REQUIREMENT_SPLIT,
            bizRefId: requirement.id,
            inputPayload: {
                requirement_id: requirement.id.toString(),
                title: requirement.title,
                background: requirement.background,
                objective: requirement.objective,
                constraints: requirement.constraints,
                deliverables: requirement.deliverables,
            },
            createdBy: userId,
            requestId: (0, uuid_1.v4)(),
        });
        return { job_id: jobId };
    }
    async onSplitJobSuccess(requirementId) {
        const requirement = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
        });
        if (!requirement) {
            return;
        }
        const currentStatus = requirement.status;
        const transitionResult = state_machines_1.RequirementStateMachine.validateTransition(currentStatus, enums_1.RequirementStatus.SPLIT_DONE);
        if (!transitionResult.valid) {
            return;
        }
        await this.prisma.requirement.update({
            where: { id: requirementId },
            data: { status: enums_1.RequirementStatus.SPLIT_DONE },
        });
    }
    async update(id, dto) {
        const existing = await this.prisma.requirement.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Requirement with id ${id} not found`);
        }
        if (dto.status && dto.status !== existing.status) {
            const currentStatus = existing.status;
            const newStatus = dto.status;
            const result = state_machines_1.RequirementStateMachine.validateTransition(currentStatus, newStatus);
            if (!result.valid) {
                throw new common_1.BadRequestException(result.error);
            }
        }
        if (dto.due_date) {
            const dueDate = new Date(dto.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate <= today) {
                throw new common_1.BadRequestException('due_date must be a future date');
            }
        }
        const updateData = {};
        if (dto.title !== undefined)
            updateData.title = dto.title;
        if (dto.background !== undefined)
            updateData.background = dto.background;
        if (dto.objective !== undefined)
            updateData.objective = dto.objective;
        if (dto.constraints !== undefined)
            updateData.constraints = dto.constraints;
        if (dto.deliverables !== undefined)
            updateData.deliverables = dto.deliverables;
        if (dto.priority !== undefined)
            updateData.priority = dto.priority;
        if (dto.due_date !== undefined)
            updateData.dueDate = new Date(dto.due_date);
        if (dto.status !== undefined)
            updateData.status = dto.status;
        if (dto.project_id !== undefined)
            updateData.projectId = BigInt(dto.project_id);
        const updated = await this.prisma.requirement.update({
            where: { id },
            data: updateData,
        });
        return updated;
    }
    async confirmSplit(requirementId, dto) {
        const requirement = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
        });
        if (!requirement) {
            throw new common_1.NotFoundException(`Requirement with id ${requirementId} not found`);
        }
        const currentStatus = requirement.status;
        if (currentStatus !== enums_1.RequirementStatus.ANALYZING &&
            currentStatus !== enums_1.RequirementStatus.SPLIT_DONE) {
            throw new common_1.BadRequestException(`无法确认任务树：需求当前状态为"${currentStatus}"，只有"分析中"或"已拆解"状态的需求才能确认。`);
        }
        const taskIds = await this.prisma.$transaction(async (tx) => {
            const taskKeyToId = new Map();
            const createdTaskIds = [];
            const sortedTasks = this.topologicalSortTasks(dto.tasks);
            for (const taskDto of sortedTasks) {
                let parentTaskId = null;
                if (taskDto.parent_key) {
                    const resolvedId = taskKeyToId.get(taskDto.parent_key);
                    if (!resolvedId) {
                        throw new common_1.BadRequestException(`Invalid parent_key '${taskDto.parent_key}' for task '${taskDto.task_key}'. Parent task not found in the tree.`);
                    }
                    parentTaskId = resolvedId;
                }
                const createdTask = await tx.task.create({
                    data: {
                        requirementId: requirementId,
                        parentTaskId: parentTaskId,
                        title: taskDto.title,
                        description: taskDto.description || null,
                        estimatedHours: taskDto.estimated_hours ?? null,
                        acceptanceCriteria: taskDto.acceptance_criteria || null,
                        status: 'todo',
                        priority: requirement.priority,
                    },
                });
                taskKeyToId.set(taskDto.task_key, createdTask.id);
                createdTaskIds.push(createdTask.id);
                await this.outboxService.writeEvent(tx, {
                    eventType: event_types_1.EventTypes.TASK_CREATED,
                    aggregateType: 'task',
                    aggregateId: createdTask.id,
                    payload: {
                        task_id: createdTask.id.toString(),
                        requirement_id: requirementId.toString(),
                        title: createdTask.title,
                        parent_task_id: parentTaskId?.toString() ?? null,
                    },
                });
            }
            await tx.requirement.update({
                where: { id: requirementId },
                data: { status: enums_1.RequirementStatus.ASSIGNED },
            });
            return createdTaskIds;
        });
        return { task_ids: taskIds.map((id) => id.toString()) };
    }
    topologicalSortTasks(tasks) {
        const sorted = [];
        const remaining = [...tasks];
        const resolved = new Set();
        let maxIterations = remaining.length + 1;
        while (remaining.length > 0 && maxIterations > 0) {
            maxIterations--;
            const beforeLength = remaining.length;
            for (let i = remaining.length - 1; i >= 0; i--) {
                const task = remaining[i];
                if (!task.parent_key || resolved.has(task.parent_key)) {
                    sorted.push(task);
                    resolved.add(task.task_key);
                    remaining.splice(i, 1);
                }
            }
            if (remaining.length === beforeLength) {
                throw new common_1.BadRequestException(`Circular dependency detected in task tree. Unresolvable tasks: ${remaining.map((t) => t.task_key).join(', ')}`);
            }
        }
        return sorted;
    }
    async remove(id) {
        const requirement = await this.prisma.requirement.findUnique({
            where: { id },
            include: { tasks: { select: { id: true }, take: 1 } },
        });
        if (!requirement) {
            throw new common_1.NotFoundException(`Requirement with id ${id} not found`);
        }
        if (requirement.tasks && requirement.tasks.length > 0) {
            throw new common_1.BadRequestException('该需求已有关联任务，不能删除。请先删除关联的任务。');
        }
        await this.prisma.requirement.delete({ where: { id } });
        return { deleted: true };
    }
};
exports.RequirementService = RequirementService;
exports.RequirementService = RequirementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        ai_job_service_1.AiJobService,
        outbox_service_1.OutboxService])
], RequirementService);
//# sourceMappingURL=requirement.service.js.map