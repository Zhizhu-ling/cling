import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infra/prisma';
import { AiJobType, TaskStatus } from '../../domain/enums';
import { TaskStateMachine } from '../../domain/state-machines';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { EventTypes } from '../../events';
import { PaginatedList, normalizePagination } from '../../common/interfaces';
import { TaskQueryDto } from './dto';
import type { Task } from '@prisma/client';

/**
 * TaskService handles task-related business logic.
 * Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.3
 */
@Injectable()
export class TaskService {
  private readonly taskStateMachine = new TaskStateMachine();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiJobService: AiJobService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * GET /api/v1/tasks - Paginated task list with filters.
   * Supports filtering by requirement_id, owner_id, and status.
   *
   * Validates: Requirements 7.1, 7.3
   */
  async findAll(query: TaskQueryDto): Promise<PaginatedList<Task>> {
    const { page, page_size } = normalizePagination(query);

    // Build filter conditions
    const where: Record<string, any> = {};
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

  /**
   * GET /api/v1/tasks/:id - Task detail with status logs timeline.
   * Returns the task with its status logs ordered by createdAt desc.
   *
   * Validates: Requirements 7.1, 7.3
   */
  async findOne(id: bigint) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        statusLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }

    return task;
  }

  /**
   * Submit an AI assignment suggestion job.
   * Fetches tasks by IDs and all active member profiles,
   * then creates an AI job for assignment suggestions.
   *
   * Validates: Requirements 4.1, 4.2, 4.4
   *
   * @param taskIds - Array of task IDs to get suggestions for
   * @param userId - The user requesting the suggestions
   * @returns The AI job ID for polling
   */
  async suggestAssignment(
    taskIds: number[],
    userId: bigint,
  ): Promise<{ job_id: string }> {
    // Fetch tasks by IDs
    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: taskIds.map((id) => BigInt(id)) },
      },
    });

    if (tasks.length === 0) {
      throw new NotFoundException(
        'No tasks found for the provided task_ids',
      );
    }

    // Fetch all active member profiles (users with role=member and status=active)
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

    // Prepare task info for AI input
    const taskInfo = tasks.map((task) => ({
      id: task.id.toString(),
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimatedHours: task.estimatedHours?.toString() ?? null,
      status: task.status,
      requirementId: task.requirementId.toString(),
    }));

    // Prepare member profiles for AI input
    const memberProfiles = members.map((profile) => ({
      userId: profile.userId.toString(),
      name: profile.user.name,
      skillTags: profile.skillTags,
      skillLevel: profile.skillLevel,
      currentWorkload: profile.currentWorkload?.toString() ?? null,
      availableHoursPerWeek: profile.availableHoursPerWeek?.toString() ?? null,
      historicalSuccessRate: profile.historicalSuccessRate?.toString() ?? null,
    }));

    // Create and dispatch AI job
    const jobId = await this.aiJobService.createAndDispatch({
      jobType: AiJobType.ASSIGNMENT_SUGGEST,
      inputPayload: {
        tasks: taskInfo,
        members: memberProfiles,
      },
      createdBy: userId,
      requestId: uuidv4(),
    });

    return { job_id: jobId };
  }

  /**
   * Assign tasks to members in a single atomic batch.
   * All assignments succeed or all fail together.
   *
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   *
   * @param assignments - Array of { task_id, member_id } pairs
   * @returns assigned_count and task_ids
   */
  async assignTasks(
    assignments: Array<{ task_id: number; member_id: number }>,
  ): Promise<{ assigned_count: number; task_ids: number[] }> {
    const memberIds = [
      ...new Set(assignments.map((a) => BigInt(a.member_id))),
    ];
    const taskIds = assignments.map((a) => BigInt(a.task_id));

    const result = await this.prisma.$transaction(async (tx) => {
      // Validate ALL assigned members exist and have active status
      const activeMembers = await tx.user.findMany({
        where: {
          id: { in: memberIds },
          status: 'active',
        },
        select: { id: true },
      });

      const activeMemberIdSet = new Set(
        activeMembers.map((m) => m.id.toString()),
      );

      // If ANY member is invalid, reject the ENTIRE batch
      for (const memberId of memberIds) {
        if (!activeMemberIdSet.has(memberId.toString())) {
          throw new BadRequestException(
            `Member with id ${memberId} does not exist or is not active`,
          );
        }
      }

      // Validate all tasks exist
      const existingTasks = await tx.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true },
      });

      const existingTaskIdSet = new Set(
        existingTasks.map((t) => t.id.toString()),
      );

      for (const taskId of taskIds) {
        if (!existingTaskIdSet.has(taskId.toString())) {
          throw new NotFoundException(
            `Task with id ${taskId} does not exist`,
          );
        }
      }

      const now = new Date();
      const assignedTaskIds: number[] = [];

      for (const assignment of assignments) {
        const taskId = BigInt(assignment.task_id);
        const memberId = BigInt(assignment.member_id);

        // Update task: set ownerId, status to 'todo', record assignment timestamp
        await tx.task.update({
          where: { id: taskId },
          data: {
            ownerId: memberId,
            status: 'todo',
            startDate: now,
            updatedAt: now,
          },
        });

        // Create notification for the assigned member
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

        // Write task.assigned outbox event
        await this.outboxService.writeEvent(tx, {
          eventType: EventTypes.TASK_ASSIGNED,
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

  /**
   * Update task status with state machine validation, permission checks,
   * deduplication, and atomic outbox event emission.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param taskId - The task ID to update
   * @param newStatus - The target status
   * @param userId - The current user's ID
   * @param userRole - The current user's role
   * @param options - Optional progress, note, blocked_reason
   * @returns The updated task status info
   */
  async updateTaskStatus(
    taskId: bigint,
    newStatus: TaskStatus,
    userId: bigint,
    userRole: string,
    options?: {
      progress?: number;
      note?: string;
      blocked_reason?: string;
    },
  ): Promise<{
    task_id: string;
    previous_status: string;
    current_status: string;
    updated_at: string;
  }> {
    // Fetch the task
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} does not exist`);
    }

    // Permission check: user must be task owner OR have role manager/admin
    const isOwner = task.ownerId !== null && task.ownerId === userId;
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';

    if (!isOwner && !isManagerOrAdmin) {
      throw new ForbiddenException(
        'Only the task owner, a manager, or an admin can update task status',
      );
    }

    const currentStatus = task.status as TaskStatus;

    // Deduplication: reject if new status equals current status
    if (currentStatus === newStatus) {
      throw new BadRequestException(
        `Task is already in "${newStatus}" status`,
      );
    }

    // Validate transition via state machine
    const isAdmin = userRole === 'admin';
    const transitionResult = this.taskStateMachine.validateTransition(
      currentStatus,
      newStatus,
      {
        isAdmin,
        blockedReason: options?.blocked_reason,
        progress: options?.progress,
      },
    );

    if (!transitionResult.valid) {
      throw new BadRequestException(transitionResult.error);
    }

    // Build update data with side effects
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Apply side effects from state machine (e.g., done → completedAt, progress=100)
    if (transitionResult.sideEffects?.completedAt) {
      updateData.completedAt = transitionResult.sideEffects.completedAt;
    }
    if (transitionResult.sideEffects?.progress !== undefined) {
      updateData.progressPercent = transitionResult.sideEffects.progress;
    }

    // If progress is provided and no side effect overrides it, apply it
    if (
      options?.progress !== undefined &&
      transitionResult.sideEffects?.progress === undefined
    ) {
      updateData.progressPercent = options.progress;
    }

    // Execute atomically: update task + create status log + write outbox events
    const result = await this.prisma.$transaction(async (tx) => {
      // Update task status
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: updateData,
      });

      // Create TaskStatusLog entry
      await tx.taskStatusLog.create({
        data: {
          taskId: taskId,
          status: newStatus,
          progressPercent:
            (updateData.progressPercent as number) ?? options?.progress ?? null,
          note: options?.note ?? null,
          blockedReason: options?.blocked_reason ?? null,
          sourceType: 'manual',
          createdBy: userId,
        },
      });

      // Emit task.status_changed event
      await this.outboxService.writeEvent(tx, {
        eventType: EventTypes.TASK_STATUS_CHANGED,
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

      // Emit task.blocked event if transitioning to blocked
      if (newStatus === TaskStatus.BLOCKED) {
        await this.outboxService.writeEvent(tx, {
          eventType: EventTypes.TASK_BLOCKED,
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

      // Emit task.done event if transitioning to done
      if (newStatus === TaskStatus.DONE) {
        await this.outboxService.writeEvent(tx, {
          eventType: EventTypes.TASK_DONE,
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

  /**
   * 获取任务评论列表（按创建时间正序）。
   */
  async getComments(taskId: bigint) {
    // 验证任务存在
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
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

  /**
   * 添加任务评论。
   */
  async addComment(taskId: bigint, content: string, authorId: bigint) {
    // 验证任务存在
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task with id ${taskId} not found`);
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
}
