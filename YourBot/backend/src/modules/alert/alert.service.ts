import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma';
import { OutboxService } from '../outbox/outbox.service';
import { EventTypes } from '../../events/event-types';
import { AlertType, AlertSeverity } from '../../domain/enums/alert-type.enum';
import { TaskStatus } from '../../domain/enums/task-status.enum';

/** Deduplication threshold in hours - don't create duplicate alerts within this window */
const DEDUP_THRESHOLD_HOURS = 24;

/** Blocked threshold in hours - tasks blocked longer than this trigger an alert */
const BLOCKED_THRESHOLD_HOURS = 24;

/** Detection interval in milliseconds (5 minutes) */
const DETECTION_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Periodic detection job that runs every 5 minutes.
   * Detects delayed tasks, blocked tasks, and overloaded members.
   */
  @Interval(DETECTION_INTERVAL_MS)
  async runDetection(): Promise<void> {
    this.logger.log('Running alert detection cycle...');
    try {
      await this.detectDelayedTasks();
      await this.detectBlockedTasks();
      await this.detectOverloadedMembers();
      this.logger.log('Alert detection cycle completed.');
    } catch (error) {
      this.logger.error('Alert detection cycle failed', error);
    }
  }

  /**
   * Detect overdue tasks: past due_date and status ≠ done.
   * Creates alert with type=delay for each detected task.
   */
  async detectDelayedTasks(): Promise<void> {
    const now = new Date();

    const overdueTasks = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: TaskStatus.DONE },
      },
      include: {
        owner: { select: { id: true, name: true } },
        requirement: { select: { id: true, title: true } },
      },
    });

    for (const task of overdueTasks) {
      const isDuplicate = await this.isDuplicateAlert(
        AlertType.DELAY,
        task.id,
        null,
      );
      if (isDuplicate) {
        continue;
      }

      const daysOverdue = Math.ceil(
        (now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24),
      );
      const severity = this.calculateDelaySeverity(daysOverdue);

      await this.createAlertWithOutbox({
        taskId: task.id,
        requirementId: task.requirementId,
        alertType: AlertType.DELAY,
        severity,
        title: `任务逾期: ${task.title}`,
        description: `任务「${task.title}」已逾期 ${daysOverdue} 天，负责人: ${task.owner?.name ?? '未分配'}`,
        suggestion: `请联系负责人确认进度，或考虑调整截止日期。`,
      });
    }
  }

  /**
   * Detect tasks blocked for more than 24 hours.
   * Uses TaskStatusLog to determine how long a task has been in blocked status.
   * Creates alert with type=blocked for each detected task.
   */
  async detectBlockedTasks(): Promise<void> {
    const thresholdTime = new Date(
      Date.now() - BLOCKED_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    // Find tasks currently in blocked status
    const blockedTasks = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.BLOCKED,
      },
      include: {
        owner: { select: { id: true, name: true } },
        requirement: { select: { id: true, title: true } },
        statusLogs: {
          where: { status: TaskStatus.BLOCKED },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const task of blockedTasks) {
      // Check when the task was last set to blocked
      const lastBlockedLog = task.statusLogs[0];
      if (!lastBlockedLog) {
        continue;
      }

      // Only alert if blocked for more than threshold
      if (lastBlockedLog.createdAt > thresholdTime) {
        continue;
      }

      const isDuplicate = await this.isDuplicateAlert(
        AlertType.BLOCKED,
        task.id,
        null,
      );
      if (isDuplicate) {
        continue;
      }

      const hoursBlocked = Math.ceil(
        (Date.now() - lastBlockedLog.createdAt.getTime()) / (1000 * 60 * 60),
      );

      await this.createAlertWithOutbox({
        taskId: task.id,
        requirementId: task.requirementId,
        alertType: AlertType.BLOCKED,
        severity: AlertSeverity.HIGH,
        title: `任务阻塞超过24小时: ${task.title}`,
        description: `任务「${task.title}」已被阻塞 ${hoursBlocked} 小时，原因: ${lastBlockedLog.blockedReason ?? '未说明'}`,
        suggestion: `请协调资源解除阻塞，或重新评估任务依赖关系。`,
      });
    }
  }

  /**
   * Detect members whose currentWorkload exceeds availableHoursPerWeek.
   * Creates alert with type=overload for each overloaded member.
   */
  async detectOverloadedMembers(): Promise<void> {
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

      // For overload alerts, use a convention: taskId = null, requirementId = null
      // Deduplication is based on alertType + userId stored in description
      const isDuplicate = await this.isDuplicateOverloadAlert(profile.userId);
      if (isDuplicate) {
        continue;
      }

      const overloadPercent = Math.round(
        ((workload - available) / available) * 100,
      );

      await this.createAlertWithOutbox({
        taskId: null,
        requirementId: null,
        alertType: AlertType.OVERLOAD,
        severity:
          overloadPercent > 50 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        title: `成员工作量超载: ${profile.user.name}`,
        description: `成员「${profile.user.name}」(ID:${profile.userId}) 当前工作量 ${workload}h 超出可用时间 ${available}h/周，超载 ${overloadPercent}%`,
        suggestion: `建议重新分配部分任务，或与成员沟通调整工作安排。`,
      });
    }
  }

  /**
   * Resolve an alert by setting its status to 'resolved' and resolvedAt timestamp.
   */
  async resolveAlert(alertId: bigint): Promise<void> {
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Check if a duplicate alert already exists (same type, same entity, open status)
   * within the deduplication threshold period.
   */
  private async isDuplicateAlert(
    alertType: string,
    taskId: bigint | null,
    requirementId: bigint | null,
  ): Promise<boolean> {
    const thresholdDate = new Date(
      Date.now() - DEDUP_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

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

  /**
   * Check if a duplicate overload alert exists for a specific member.
   * Uses description field containing the userId for matching.
   */
  private async isDuplicateOverloadAlert(userId: bigint): Promise<boolean> {
    const thresholdDate = new Date(
      Date.now() - DEDUP_THRESHOLD_HOURS * 60 * 60 * 1000,
    );

    const existing = await this.prisma.alert.findFirst({
      where: {
        alertType: AlertType.OVERLOAD,
        status: 'open',
        createdAt: { gte: thresholdDate },
        description: { contains: `(ID:${userId})` },
      },
    });

    return existing !== null;
  }

  /**
   * Create an alert and emit an outbox event atomically within a transaction.
   */
  private async createAlertWithOutbox(params: {
    taskId: bigint | null;
    requirementId: bigint | null;
    alertType: string;
    severity: string;
    title: string;
    description: string;
    suggestion: string;
  }): Promise<void> {
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
        eventType: EventTypes.ALERT_CREATED,
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

      this.logger.log(
        `Alert created: type=${params.alertType}, title="${params.title}"`,
      );
    });
  }

  /**
   * Calculate severity based on how many days a task is overdue.
   */
  private calculateDelaySeverity(daysOverdue: number): string {
    if (daysOverdue >= 7) return AlertSeverity.CRITICAL;
    if (daysOverdue >= 3) return AlertSeverity.HIGH;
    if (daysOverdue >= 1) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }
}
