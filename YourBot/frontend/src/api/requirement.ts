import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * Requirement status values matching backend enum.
 */
export type RequirementStatus =
  | 'draft'
  | 'analyzing'
  | 'split_done'
  | 'assigned'
  | 'in_progress'
  | 'closed';

/**
 * Priority values: 1=critical, 2=high, 3=medium, 4=low
 */
export type RequirementPriority = 1 | 2 | 3 | 4;

/**
 * Requirement data returned from the backend.
 */
export interface Requirement {
  id: number;
  project_id?: number;
  title: string;
  background: string;
  objective: string;
  constraints?: string;
  deliverables: string[];
  priority: RequirementPriority;
  due_date: string;
  status: RequirementStatus;
  created_by: number;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated list response structure.
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
 * Query parameters for listing requirements.
 */
export interface RequirementQuery {
  page?: number;
  page_size?: number;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  sort_by?: 'created_at' | 'due_date';
  sort_order?: 'asc' | 'desc';
}

/**
 * Parameters for creating a new requirement.
 */
export interface CreateRequirementParams {
  title: string;
  background: string;
  objective: string;
  constraints?: string;
  deliverables: string[];
  priority: RequirementPriority;
  due_date: string;
  project_id?: number;
}

/**
 * Parameters for updating an existing requirement.
 */
export interface UpdateRequirementParams {
  title?: string;
  background?: string;
  objective?: string;
  constraints?: string;
  deliverables?: string[];
  priority?: RequirementPriority;
  due_date?: string;
  status?: RequirementStatus;
  project_id?: number;
}

/**
 * Requirement API endpoints.
 */
export const requirementApi = {
  /**
   * POST /api/v1/requirements
   * Create a new requirement.
   */
  create: (data: CreateRequirementParams) =>
    apiClient.post<ApiResponse<{ id: number; status: string }>>('/requirements', data),

  /**
   * GET /api/v1/requirements
   * Get paginated list with filters and sorting.
   */
  list: (query?: RequirementQuery) =>
    apiClient.get<ApiResponse<PaginatedList<Requirement>>>('/requirements', { params: query }),

  /**
   * GET /api/v1/requirements/:id
   * Get requirement detail.
   */
  getById: (id: number) =>
    apiClient.get<ApiResponse<Requirement>>(`/requirements/${id}`),

  /**
   * PUT /api/v1/requirements/:id
   * Update an existing requirement.
   */
  update: (id: number, data: UpdateRequirementParams) =>
    apiClient.put<ApiResponse<Requirement>>(`/requirements/${id}`, data),

  /**
   * DELETE /api/v1/requirements/:id
   * Delete a requirement (only draft status).
   */
  delete: (id: number) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/requirements/${id}`),
};
