import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * User profile returned from the backend.
 */
export interface UserProfile {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  email?: string;
  avatar?: string;
  status?: string;
}

/**
 * Login request parameters.
 */
export interface LoginParams {
  username: string;
  password: string;
}

/**
 * Login response data from the backend.
 */
export interface LoginResponseData {
  token: string;
  user: UserProfile;
}

/**
 * Auth API endpoints.
 */
export const authApi = {
  /**
   * POST /api/v1/auth/login
   * Authenticate user with username and password.
   */
  login: (data: LoginParams) =>
    apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', data),

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user's profile.
   */
  getMe: () => apiClient.get<ApiResponse<UserProfile>>('/auth/me'),

  /**
   * POST /api/v1/auth/logout
   * Logout current user.
   */
  logout: () => apiClient.post<ApiResponse<null>>('/auth/logout'),
};
