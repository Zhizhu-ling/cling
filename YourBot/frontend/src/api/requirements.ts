import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * Requirement priority mapping.
 */
export const PRIORITY_MAP: Record<number, string> = {
  1: '紧急',
  2: '高',
  3: '中',
  4: '低',
};

/**
 * Requirement detail returned from the backend.
 */
export interface RequirementDetail {
  id: number;
  title: string;
  background: string;
  objective: string;
  constraints: string | null;
  deliverables: string[];
  priority: number;
  dueDate: string;
  status: string;
  createdBy: number;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single task in the AI-generated task tree.
 */
export interface AiGeneratedTask {
  id?: string;
  title: string;
  description: string;
  estimatedHours: number;
  acceptanceCriteria: string;
  dependencies: string[];
  children?: AiGeneratedTask[];
}

/**
 * Split result returned from the AI job output.
 */
export interface SplitResult {
  tasks: AiGeneratedTask[];
}

/**
 * Confirm split request body.
 */
export interface ConfirmSplitPayload {
  tasks: AiGeneratedTask[];
}

/**
 * Requirements API endpoints.
 */
export const requirementsApi = {
  /**
   * GET /api/v1/requirements/:id
   * Get requirement detail.
   */
  getDetail: (id: number) =>
    apiClient.get<ApiResponse<RequirementDetail>>(`/requirements/${id}`),

  /**
   * POST /api/v1/requirements/:id/split
   * Trigger AI decomposition for a requirement. Returns a job_id for polling.
   */
  split: (id: number) =>
    apiClient.post<ApiResponse<{ job_id: string }>>(`/requirements/${id}/split`),

  /**
   * POST /api/v1/requirements/:id/confirm-split
   * Confirm the AI-generated task tree and persist to database.
   */
  confirmSplit: (id: number, payload: ConfirmSplitPayload) =>
    apiClient.post<ApiResponse<{ task_ids: number[] }>>(
      `/requirements/${id}/confirm-split`,
      payload,
    ),
};
