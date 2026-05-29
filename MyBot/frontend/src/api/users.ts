import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * User role values.
 */
export type UserRole = 'admin' | 'manager' | 'member';

/**
 * User status values.
 */
export type UserStatus = 'active' | 'disabled';

/**
 * User data returned from the backend.
 */
export interface UserData {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Member profile data for skills/workload management.
 */
export interface MemberProfileData {
  id: number;
  userId: number;
  skillTags: string[] | null;
  skillLevel: number | null;
  preferredTaskTypes: string[] | null;
  avoidTaskTypes: string[] | null;
  currentWorkload: number | null;
  availableHoursPerWeek: number | null;
  historicalSuccessRate: number | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated list response.
 */
export interface PaginatedUserList {
  list: UserData[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

/**
 * Query parameters for user list.
 */
export interface UserQuery {
  page?: number;
  page_size?: number;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * DTO for creating a new user.
 */
export interface CreateUserParams {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar?: string;
}

/**
 * DTO for updating a user.
 */
export interface UpdateUserParams {
  role?: UserRole;
  status?: UserStatus;
  name?: string;
  phone?: string;
  avatar?: string;
}

/**
 * User management API endpoints.
 */
export const usersApi = {
  /**
   * GET /api/v1/users
   * Get paginated user list with optional filters.
   */
  getUsers: (params?: UserQuery) =>
    apiClient.get<ApiResponse<PaginatedUserList>>('/users', { params }),

  /**
   * POST /api/v1/users
   * Create a new user.
   */
  createUser: (data: CreateUserParams) =>
    apiClient.post<ApiResponse<UserData>>('/users', data),

  /**
   * PUT /api/v1/users/:id
   * Update user role/status/profile.
   */
  updateUser: (id: string, data: UpdateUserParams) =>
    apiClient.put<ApiResponse<UserData>>(`/users/${id}`, data),

  /**
   * PUT /api/v1/users/:id/deactivate
   * Deactivate a user account.
   */
  deactivateUser: (id: string) =>
    apiClient.put<ApiResponse<UserData>>(`/users/${id}/deactivate`),

  /**
   * DELETE /api/v1/users/:id
   * Delete a user account (admin only).
   */
  deleteUser: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/users/${id}`),
};
