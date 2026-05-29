import apiClient from './client';
import type { ApiResponse } from './client';
import type { TaskStatus } from './tasks';

/**
 * A task item as returned by the board endpoint.
 */
export interface BoardTaskItem {
  id: number;
  title: string;
  owner_name: string | null;
  priority: number | null;
  due_date: string | null;
  status: TaskStatus;
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
 * Query parameters for the board endpoint.
 */
export interface BoardQuery {
  requirement_id?: number;
  owner_id?: number;
}

/**
 * Overview cards data showing key metrics.
 */
export interface OverviewCardsData {
  requirements_count: number;
  active_tasks_count: number;
  completed_tasks_count: number;
  overdue_tasks_count: number;
}

/**
 * Task status distribution item for chart display.
 */
export interface TaskStatusDistributionItem {
  status: TaskStatus;
  count: number;
}

/**
 * Member workload item showing load per member.
 */
export interface MemberWorkloadItem {
  user_id: number;
  name: string;
  assigned_tasks: number;
  completed_tasks: number;
  current_workload_hours: number;
  available_hours: number;
}

/**
 * Active alert item for the dashboard.
 */
export interface ActiveAlertItem {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  task_id: number | null;
  requirement_id: number | null;
  created_at: string;
}

/**
 * Full dashboard data returned by GET /api/v1/dashboard.
 */
export interface DashboardData {
  overview_cards: OverviewCardsData;
  task_status_distribution: TaskStatusDistributionItem[];
  member_workload: MemberWorkloadItem[];
  active_alerts: ActiveAlertItem[];
}

/**
 * Dashboard API endpoints.
 */
export const dashboardApi = {
  /**
   * GET /api/v1/dashboard/board
   * Returns tasks grouped by status columns.
   * Supports filters: requirement_id, owner_id.
   */
  getBoard: (params?: BoardQuery) =>
    apiClient.get<ApiResponse<BoardData>>('/dashboard/board', { params }),

  /**
   * GET /api/v1/dashboard
   * Returns dashboard overview data including cards, charts, workload, and alerts.
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   */
  getDashboard: () =>
    apiClient.get<ApiResponse<DashboardData>>('/dashboard'),
};
