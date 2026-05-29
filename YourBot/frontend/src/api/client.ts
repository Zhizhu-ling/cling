import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unified API response format from the backend.
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

/**
 * HTTP methods that are considered "write" operations
 * and should include an idempotency key header.
 */
const WRITE_METHODS = new Set(['post', 'put', 'delete', 'patch']);

/**
 * Token key used in localStorage.
 */
const TOKEN_KEY = 'token';

/**
 * Configured Axios instance for all API calls.
 * - baseURL: /api/v1
 * - Timeout: 30s
 */
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

/**
 * Request interceptor:
 * 1. Attach JWT Bearer token from localStorage
 * 2. Inject X-Idempotency-Key header for write requests (POST, PUT, DELETE, PATCH)
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Attach JWT token
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }

    // Inject idempotency key for write methods
    const method = (config.method ?? '').toLowerCase();
    if (WRITE_METHODS.has(method)) {
      config.headers.set('X-Idempotency-Key', uuidv4());
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor:
 * - Unified error handling
 * - 40101 error code → redirect to /login
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const responseData = error.response?.data;

    // Handle 40101 unauthorized: token expired or invalid
    if (responseData?.code === 40101) {
      // Clear stored token
      localStorage.removeItem(TOKEN_KEY);
      // Redirect to login page
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default apiClient;
