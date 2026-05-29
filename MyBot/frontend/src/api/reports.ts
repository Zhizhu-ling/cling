import apiClient from './client';
import type { ApiResponse } from './client';

/**
 * Report type values.
 */
export type ReportType = 'daily' | 'weekly' | 'stage';

/**
 * Report data returned from the backend.
 */
export interface Report {
  id: number;
  projectId: number | null;
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  title: string;
  summary: string | null;
  content: string | null;
  riskSummary: string | null;
  aiGenerated: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: { id: number; name: string } | null;
}

/**
 * Paginated list response for reports.
 */
export interface PaginatedReportList {
  list: Report[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

/**
 * Query parameters for listing reports.
 */
export interface ReportQuery {
  page?: number;
  page_size?: number;
  report_type?: ReportType;
  date_from?: string;
  date_to?: string;
}

/**
 * DTO for generating a report via AI.
 */
export interface GenerateReportDto {
  report_type: ReportType;
  date_from: string;
  date_to: string;
}

/**
 * DTO for updating a report.
 */
export interface UpdateReportDto {
  title?: string;
  summary?: string;
  content?: string;
  risk_summary?: string;
}

/**
 * Reports API endpoints.
 */
export const reportsApi = {
  /**
   * GET /api/v1/reports
   * Get paginated report list with optional filters.
   */
  list: (params?: ReportQuery) =>
    apiClient.get<ApiResponse<PaginatedReportList>>('/reports', { params }),

  /**
   * GET /api/v1/reports/:id
   * Get a single report by ID.
   */
  getById: (id: number | string) =>
    apiClient.get<ApiResponse<Report>>(`/reports/${id}`),

  /**
   * POST /api/v1/reports/generate
   * Submit AI report generation job. Returns { job_id }.
   */
  generate: (dto: GenerateReportDto) =>
    apiClient.post<ApiResponse<{ job_id: string }>>('/reports/generate', dto),

  /**
   * PUT /api/v1/reports/:id
   * Update an existing report.
   */
  update: (id: number | string, dto: UpdateReportDto) =>
    apiClient.put<ApiResponse<Report>>(`/reports/${id}`, dto),
};
