import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma';
import { TaskStatus } from '../../domain/enums';

/**
 * Board task item returned in each kanban column.
 */
export interface BoardTaskItem {
  id: string;
  title: string;
  owner_name: string | null;
  priority: number | null;
  due_date: string | null;
  status: string;
  blocked_reason: string | null;
}

/**
 * Board data grouped by status columns.
 */
export interface BoardData {
  todo: BoardTaskItem[];
  doing: BoardTaskItem[];
  blocked: BoardTaskItem[];
  done: BoardTaskItem[];
  delayed: BoardTaskItem[];
}

/**
 * Overview cards showing key metrics.
 * Validates: Requirements 9.1
 */
export interface OverviewCards {
  total_requirements: number;
  active_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

/**
 * Task status distribution for chart display.
 * Validates: Requirements 9.2
 */
export interface TaskStatusDistribution {
  todo: number;
  doing: number;
  blocked: number;
  done: number;
  delayed: number;
}

/**
 * Member workload item.
 * Validates: Requirements 9.3
 */
export interface MemberWorkloadItem {
  member_name: string;
  current_workload: number;
  available_hours: number;
}

/**
 * Active alert item.
 */
export interface ActiveAlertItem {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

/**
 * Dashboard overview response data.
 * Validates: Requirements 9.1, 9.2, 9.3
 */
export interface DashboardOverviewData {
  overview_cards: OverviewCards;
  task_status_distribution: TaskStatusDistribution;
  member_workload: MemberWorkloadItem[];
  active_alerts: ActiveAlertItem[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard overview data including overview cards, task status distribution,
   * member workload, and active alerts.
   * Validates: Requirements 9.1, 9.2, 9.3
   */
  async getOverview(): Promise<DashboardOverviewData> {
    const [
      overviewCards,
      taskStatusDistribution,
      memberWorkload,
      activeAlerts,
    ] = await Promise.all([
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

  /**
   * Get overview cards: total requirements, active tasks, completed tasks, overdue tasks.
   */
  private async getOverviewCards(): Promise<OverviewCards> {
    const now = new Date();

    const [totalRequirements, activeTasks, completedTasks, overdueTasks] =
      await Promise.all([
        this.prisma.requirement.count(),
        this.prisma.task.count({
          where: {
            status: { in: [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.BLOCKED] },
          },
        }),
        this.prisma.task.count({
          where: { status: TaskStatus.DONE },
        }),
        this.prisma.task.count({
          where: {
            status: { not: TaskStatus.DONE },
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

  /**
   * Get task status distribution for chart display.
   */
  private async getTaskStatusDistribution(): Promise<TaskStatusDistribution> {
    const statusCounts = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const distribution: TaskStatusDistribution = {
      todo: 0,
      doing: 0,
      blocked: 0,
      done: 0,
      delayed: 0,
    };

    for (const item of statusCounts) {
      const status = item.status as TaskStatus;
      if (status in distribution) {
        distribution[status] = item._count.id;
      }
    }

    return distribution;
  }

  /**
   * Get member workload distribution.
   */
  private async getMemberWorkload(): Promise<MemberWorkloadItem[]> {
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

  /**
   * Get active (open) alerts list, ordered by most recent first.
   */
  private async getActiveAlerts(): Promise<ActiveAlertItem[]> {
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

  /**
   * Get kanban board data: tasks grouped by status columns with optional filters.
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  async getBoard(filters: {
    requirementId?: bigint;
    ownerId?: bigint;
  }): Promise<BoardData> {
    const where: Record<string, any> = {};

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

    // Initialize board columns
    const board: BoardData = {
      todo: [],
      doing: [],
      blocked: [],
      done: [],
      delayed: [],
    };

    // Group tasks by status
    for (const task of tasks) {
      const item: BoardTaskItem = {
        id: task.id.toString(),
        title: task.title,
        owner_name: task.owner?.name ?? null,
        priority: task.priority,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
        status: task.status,
        blocked_reason: task.statusLogs?.[0]?.blockedReason ?? null,
      };

      const status = task.status as TaskStatus;
      if (status in board) {
        board[status].push(item);
      }
    }

    return board;
  }
}
