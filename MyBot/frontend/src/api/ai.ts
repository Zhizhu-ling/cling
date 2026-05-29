import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * AI job status values returned by the backend.
 */
export type AiJobStatus = 'pending' | 'running' | 'success' | 'fail' | 'canceled';

/**
 * AI job data returned from GET /api/v1/ai/jobs/:id
 */
export interface AiJobData {
  id: string;
  jobType: string;
  status: AiJobStatus;
  requestId: string;
  bizRefId: string | null;
  inputPayload: unknown;
  outputPayload: unknown;
  rawResponse: string | null;
  promptVersion: string;
  schemaVersion: string;
  retryCount: number;
  maxRetry: number;
  errorMessage: string | null;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * AI API endpoints.
 */
export const aiApi = {
  /**
   * GET /api/v1/ai/jobs/:id
   * Get AI job status and result.
   */
  getAiJob: (jobId: string) =>
    apiClient.get<ApiResponse<AiJobData>>(`/ai/jobs/${jobId}`),

  /**
   * POST /api/v1/ai/jobs/:id/cancel
   * Cancel a pending AI job.
   */
  cancelAiJob: (jobId: string) =>
    apiClient.post<ApiResponse<{ id: string; status: string }>>(`/ai/jobs/${jobId}/cancel`),
};
