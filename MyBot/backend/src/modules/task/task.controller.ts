import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, ParseIntPipe } from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/interfaces';
import { AssignmentSuggestDto, AssignTaskDto, TaskQueryDto, UpdateTaskStatusDto } from './dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

/**
 * Task controller handling task-related endpoints.
 * Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.3
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * GET /api/v1/tasks
   * Paginated task list with filters (requirement_id, owner_id, status).
   *
   * Validates: Requirements 7.1, 7.3
   */
  @Get()
  async findAll(@Query() query: TaskQueryDto) {
    return this.taskService.findAll(query);
  }

  /**
   * GET /api/v1/tasks/:id
   * Task detail with status logs timeline (ordered by createdAt desc).
   *
   * Validates: Requirements 7.1, 7.3
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.findOne(BigInt(id));
  }

  /**
   * POST /api/v1/tasks/assignment-suggest
   * Submit an AI assignment suggestion job.
   * Only manager and admin can request suggestions.
   * Returns job_id for polling via GET /api/v1/ai/jobs/:id.
   *
   * Validates: Requirements 4.1, 4.2, 4.4
   */
  @Post('assignment-suggest')
  @Roles('manager', 'admin')
  @HttpCode(200)
  async suggestAssignment(
    @Body() dto: AssignmentSuggestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taskService.suggestAssignment(dto.task_ids, user.userId);
  }

  /**
   * POST /api/v1/tasks/assign
   * Assign tasks to members (single or batch).
   * Only manager and admin can assign tasks.
   * Batch assignment is atomic: if any assignment is invalid, the entire batch is rejected.
   * Idempotency key deduplication is applied via global middleware.
   *
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   */
  @Post('assign')
  @Roles('manager', 'admin')
  @HttpCode(200)
  async assignTasks(@Body() dto: AssignTaskDto) {
    return this.taskService.assignTasks(dto.assignments);
  }

  /**
   * POST /api/v1/tasks/:id/status
   * Update task status with state machine validation.
   * Permission: task owner, manager, or admin.
   * Deduplication: rejects same status repeated submission.
   * Emits task.status_changed (and task.blocked / task.done as applicable) events via outbox.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  @Post(':id/status')
  @HttpCode(200)
  async updateTaskStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taskService.updateTaskStatus(
      BigInt(id),
      dto.status,
      user.userId,
      user.role,
      {
        progress: dto.progress,
        note: dto.note,
        blocked_reason: dto.blocked_reason,
      },
    );
  }

  /**
   * GET /api/v1/tasks/:id/comments
   * 获取任务评论列表（按创建时间正序）。
   * 任何已认证用户均可访问。
   */
  @Get(':id/comments')
  async getComments(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.getComments(BigInt(id));
  }

  /**
   * POST /api/v1/tasks/:id/comments
   * 添加任务评论。
   */
  @Post(':id/comments')
  @HttpCode(201)
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.taskService.addComment(BigInt(id), dto.content, user.userId);
  }
}
