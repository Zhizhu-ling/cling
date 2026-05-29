import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * Task status values.
 */
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'delayed';

/**
 * Task data returned from the backend (list view).
 */
export interface TaskData {
  id: number;
  requirementId: number;
  parentTaskId: number | null;
  title: string;
  description: string | null;
  priority: number | null;
  status: TaskStatus;
  ownerId: number | null;
  ownerName?: string | null;
  collaboratorIds: number[] | null;
  estimatedHours: number | null;
  actualHours: number | null;
  progressPercent: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  riskLevel: string | null;
  aiReason: string | null;
  acceptanceCriteria: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Alias for backward compatibility.
 */
export type Task = TaskData;

/**
 * Status log entry for task history.
 */
export interface StatusLog {
  id: number;
  taskId: number;
  status: TaskStatus;
  progressPercent: number | null;
  note: string | null;
  blockedReason: string | null;
  sourceType: string | null;
  createdBy: number;
  createdAt: string;
  creator?: { id: number; name: string } | null;
}

/**
 * Task detail with related data (owner, requirement, status logs).
 */
export interface TaskDetail extends TaskData {
  owner?: { id: number; name: string; avatar?: string } | null;
  requirement?: { id: number; title: string } | null;
  statusLogs: StatusLog[];
}

/**
 * DTO for updating task status.
 */
export interface UpdateTaskStatusDto {
  status: TaskStatus;
  blocked_reason?: string;
  blockedReason?: string;
  note?: string;
  progress?: number;
  progressPercent?: number;
  progress_percent?: number;
}

/**
 * Paginated list response.
 */
export interface PaginatedList<T> {
  list: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

/**
 * Task query parameters.
 */
export interface TaskQuery {
  page?: number;
  page_size?: number;
  requirement_id?: number;
  owner_id?: number | null;
  status?: TaskStatus;
}

/**
 * Member profile for assignment suggestions.
 */
export interface MemberProfile {
  id: number;
  userId: number;
  userName: string;
  name: string;
  skillTags: string[] | null;
  skillLevel: number | null;
  currentWorkload: number | null;
  availableHoursPerWeek: number | null;
  historicalSuccessRate: number | null;
}

/**
 * Assignment suggestion from AI.
 */
export interface AssignmentSuggestion {
  taskId: number;
  taskTitle: string;
  recommendations: {
    memberId: number;
    memberName: string;
    confidence: number;
    reason: string;
  }[];
}

/**
 * Assignment request body.
 */
export interface AssignTasksRequest {
  assignments: { task_id: number; member_id: number }[];
}

/**
 * Assignment response data.
 */
export interface AssignTasksResponse {
  assigned_count: number;
  task_ids: number[];
}

/**
 * Task API endpoints.
 */
export const tasksApi = {
  /**
   * GET /api/v1/tasks
   * Get paginated task list with optional filters.
   */
  getTasks: (params?: TaskQuery) =>
    apiClient.get<ApiResponse<PaginatedList<TaskData>>>('/tasks', { params }),

  /**
   * GET /api/v1/tasks/:id
   * Get task detail with status logs.
   */
  getTask: (id: number | string) =>
    apiClient.get<ApiResponse<TaskDetail>>(`/tasks/${id}`),

  /**
   * GET /api/v1/tasks/:id
   * Alias for getTask (backward compatibility).
   */
  getById: (id: number | string) =>
    apiClient.get<ApiResponse<TaskDetail>>(`/tasks/${id}`),

  /**
   * POST /api/v1/tasks/:id/status
   * Update task status.
   */
  updateTaskStatus: (taskId: number | string, dto: UpdateTaskStatusDto) =>
    apiClient.post<ApiResponse<{ task_id: number; status: string }>>(
      `/tasks/${taskId}/status`,
      dto,
    ),

  /**
   * POST /api/v1/tasks/:id/status
   * Alias for updateTaskStatus (backward compatibility).
   */
  updateStatus: (taskId: number | string, dto: UpdateTaskStatusDto) =>
    apiClient.post<ApiResponse<{ task_id: number; status: string }>>(
      `/tasks/${taskId}/status`,
      dto,
    ),

  /**
   * POST /api/v1/tasks/assignment-suggest
   * Submit AI assignment suggestion job.
   * Returns a job_id for polling.
   */
  requestAssignmentSuggestions: (taskIds: number[]) =>
    apiClient.post<ApiResponse<{ job_id: string }>>('/tasks/assignment-suggest', {
      task_ids: taskIds,
    }),

  /**
   * POST /api/v1/tasks/assign
   * Assign tasks to members (batch).
   */
  assignTasks: (data: AssignTasksRequest) =>
    apiClient.post<ApiResponse<AssignTasksResponse>>('/tasks/assign', data),

  /**
   * GET /api/v1/users?role=member&status=active
   * Get active members for manual assignment.
   */
  getActiveMembers: () =>
    apiClient.get<ApiResponse<PaginatedList<MemberProfile>>>('/users', {
      params: { role: 'member', status: 'active', page_size: 100 },
    }),
};

/**
 * Alias for backward compatibility.
 */
export const taskApi = tasksApi;
