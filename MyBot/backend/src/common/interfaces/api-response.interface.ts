/**
 * Unified API response format
 * Validates: Requirements 11.1, 11.4
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

/**
 * Paginated list response
 * Validates: Requirements 11.3
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
 * Pagination query parameters with defaults
 * Validates: Requirements 11.3
 */
export interface PaginationQuery {
  page?: number;
  page_size?: number;
}

/** Default pagination values */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
} as const;

/**
 * Normalize pagination query parameters with defaults
 */
export function normalizePagination(query: PaginationQuery): {
  page: number;
  page_size: number;
} {
  return {
    page: query.page && query.page > 0 ? query.page : PAGINATION_DEFAULTS.PAGE,
    page_size:
      query.page_size && query.page_size > 0
        ? query.page_size
        : PAGINATION_DEFAULTS.PAGE_SIZE,
  };
}
