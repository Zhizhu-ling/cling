import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infra/prisma';
import { RequirementStatus, AiJobType } from '../../domain/enums';
import { RequirementStateMachine } from '../../domain/state-machines';
import { normalizePagination, PaginatedList } from '../../common/interfaces';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { EventTypes } from '../../events/event-types';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementQueryDto } from './dto/requirement-query.dto';
import { ConfirmSplitDto, ConfirmSplitTaskDto } from './dto/confirm-split.dto';
import { Requirement } from '@prisma/client';

@Injectable()
export class RequirementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobService: AiJobService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Create a new requirement.
   * Validates: Requirements 2.1, 2.5, 2.6
   */
  async create(
    dto: CreateRequirementDto,
    userId: bigint,
  ): Promise<{ id: bigint; status: string }> {
    // Validate due_date is in the future
    const dueDate = new Date(dto.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate <= today) {
      throw new BadRequestException('due_date must be a future date');
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
        status: RequirementStatus.DRAFT,
        createdBy: userId,
        projectId: dto.project_id ? BigInt(dto.project_id) : null,
      },
    });

    return { id: requirement.id, status: requirement.status };
  }

  /**
   * Get paginated list of requirements with filtering and sorting.
   * Validates: Requirements 2.3, 11.3
   */
  async findAll(query: RequirementQueryDto): Promise<PaginatedList<Requirement>> {
    const { page, page_size } = normalizePagination(query);

    // Build filter conditions
    const where: Record<string, any> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }

    // Build sort order
    const orderBy: Record<string, string> = {};
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

  /**
   * Get a single requirement by ID.
   */
  async findOne(id: bigint): Promise<Requirement> {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with id ${id} not found`);
    }

    return requirement;
  }

  /**
   * Submit an AI split job for a requirement.
   * Validates requirement is in 'draft' status, transitions to 'analyzing',
   * creates an AI job, and returns the job_id.
   * Validates: Requirements 3.1, 3.2, 3.4
   */
  async splitRequirement(
    id: bigint,
    userId: bigint,
  ): Promise<{ job_id: string }> {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with id ${id} not found`);
    }

    // Validate that requirement is in 'draft' status
    const currentStatus = requirement.status as RequirementStatus;
    const transitionResult = RequirementStateMachine.validateTransition(
      currentStatus,
      RequirementStatus.ANALYZING,
    );

    if (!transitionResult.valid) {
      throw new BadRequestException(
        transitionResult.error ??
          `Cannot split requirement in '${currentStatus}' status. Requirement must be in 'draft' status.`,
      );
    }

    // Transition requirement status: draft → analyzing
    await this.prisma.requirement.update({
      where: { id },
      data: { status: RequirementStatus.ANALYZING },
    });

    // Create and dispatch AI job
    const jobId = await this.aiJobService.createAndDispatch({
      jobType: AiJobType.REQUIREMENT_SPLIT,
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
      requestId: uuidv4(),
    });

    return { job_id: jobId };
  }

  /**
   * Handle AI split job success: transition requirement status to split_done.
   * Called by the AI job worker on successful completion.
   * Validates: Requirements 3.1
   */
  async onSplitJobSuccess(requirementId: bigint): Promise<void> {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      return; // Silently ignore if requirement not found
    }

    const currentStatus = requirement.status as RequirementStatus;
    const transitionResult = RequirementStateMachine.validateTransition(
      currentStatus,
      RequirementStatus.SPLIT_DONE,
    );

    if (!transitionResult.valid) {
      return; // Silently ignore if transition is not valid
    }

    await this.prisma.requirement.update({
      where: { id: requirementId },
      data: { status: RequirementStatus.SPLIT_DONE },
    });
  }

  /**
   * Update an existing requirement.
   * Validates: Requirements 2.4, 2.5, 2.6
   * Applies state machine for status transitions.
   */
  async update(
    id: bigint,
    dto: UpdateRequirementDto,
  ): Promise<Requirement> {
    const existing = await this.prisma.requirement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Requirement with id ${id} not found`);
    }

    // Validate status transition if status is being changed
    if (dto.status && dto.status !== existing.status) {
      const currentStatus = existing.status as RequirementStatus;
      const newStatus = dto.status as RequirementStatus;
      const result = RequirementStateMachine.validateTransition(
        currentStatus,
        newStatus,
      );
      if (!result.valid) {
        throw new BadRequestException(result.error);
      }
    }

    // Validate due_date is in the future if being updated
    if (dto.due_date) {
      const dueDate = new Date(dto.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate <= today) {
        throw new BadRequestException('due_date must be a future date');
      }
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.background !== undefined) updateData.background = dto.background;
    if (dto.objective !== undefined) updateData.objective = dto.objective;
    if (dto.constraints !== undefined) updateData.constraints = dto.constraints;
    if (dto.deliverables !== undefined) updateData.deliverables = dto.deliverables;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.due_date !== undefined) updateData.dueDate = new Date(dto.due_date);
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.project_id !== undefined) updateData.projectId = BigInt(dto.project_id);

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Confirm the AI-generated task tree and persist all tasks atomically.
   * Uses a database transaction to:
   *   1. Validate requirement is in 'split_done' status
   *   2. Create all tasks with parent-child relationships (resolve parent_key to parent_task_id)
   *   3. Write task.created outbox events for each task
   *   4. Transition requirement status: split_done → assigned
   *
   * Validates: Requirements 3.3, 3.4
   */
  async confirmSplit(
    requirementId: bigint,
    dto: ConfirmSplitDto,
  ): Promise<{ task_ids: string[] }> {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement) {
      throw new NotFoundException(
        `Requirement with id ${requirementId} not found`,
      );
    }

    // Validate requirement status allows confirmation
    // Accept both 'analyzing' (AI just completed) and 'split_done' states
    const currentStatus = requirement.status as RequirementStatus;
    if (
      currentStatus !== RequirementStatus.ANALYZING &&
      currentStatus !== RequirementStatus.SPLIT_DONE
    ) {
      throw new BadRequestException(
        `无法确认任务树：需求当前状态为"${currentStatus}"，只有"分析中"或"已拆解"状态的需求才能确认。`,
      );
    }

    // Execute everything in a transaction
    const taskIds = await this.prisma.$transaction(async (tx) => {
      // Map task_key → created task id for resolving parent references
      const taskKeyToId = new Map<string, bigint>();
      const createdTaskIds: bigint[] = [];

      // First pass: create tasks without parent references (root tasks)
      // Second pass: create tasks with parent references (child tasks)
      // We need to sort tasks so parents are created before children
      const sortedTasks = this.topologicalSortTasks(dto.tasks);

      for (const taskDto of sortedTasks) {
        // Resolve parent_task_id from parent_key
        let parentTaskId: bigint | null = null;
        if (taskDto.parent_key) {
          const resolvedId = taskKeyToId.get(taskDto.parent_key);
          if (!resolvedId) {
            throw new BadRequestException(
              `Invalid parent_key '${taskDto.parent_key}' for task '${taskDto.task_key}'. Parent task not found in the tree.`,
            );
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

        // Write task.created outbox event
        await this.outboxService.writeEvent(tx, {
          eventType: EventTypes.TASK_CREATED,
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

      // Transition requirement status: split_done → assigned
      await tx.requirement.update({
        where: { id: requirementId },
        data: { status: RequirementStatus.ASSIGNED },
      });

      return createdTaskIds;
    });

    return { task_ids: taskIds.map((id) => id.toString()) };
  }

  /**
   * Topologically sort tasks so that parent tasks come before their children.
   * Tasks without parent_key come first, then tasks whose parent_key has already been seen.
   */
  private topologicalSortTasks(
    tasks: ConfirmSplitTaskDto[],
  ): ConfirmSplitTaskDto[] {
    const sorted: ConfirmSplitTaskDto[] = [];
    const remaining = [...tasks];
    const resolved = new Set<string>();

    // Iteratively resolve tasks whose parents have been resolved
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

      // If no progress was made, there's a circular dependency
      if (remaining.length === beforeLength) {
        throw new BadRequestException(
          `Circular dependency detected in task tree. Unresolvable tasks: ${remaining.map((t) => t.task_key).join(', ')}`,
        );
      }
    }

    return sorted;
  }

  /**
   * Delete a requirement. Can delete if no tasks are associated.
   */
  async remove(id: bigint): Promise<{ deleted: boolean }> {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: { tasks: { select: { id: true }, take: 1 } },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with id ${id} not found`);
    }

    if (requirement.tasks && requirement.tasks.length > 0) {
      throw new BadRequestException(
        '该需求已有关联任务，不能删除。请先删除关联的任务。',
      );
    }

    await this.prisma.requirement.delete({ where: { id } });
    return { deleted: true };
  }
}
