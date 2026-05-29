import { normalizePagination, PAGINATION_DEFAULTS } from './api-response.interface';

describe('normalizePagination', () => {
  it('should return defaults when no query params provided', () => {
    const result = normalizePagination({});
    expect(result.page).toBe(PAGINATION_DEFAULTS.PAGE);
    expect(result.page_size).toBe(PAGINATION_DEFAULTS.PAGE_SIZE);
  });

  it('should use provided page and page_size', () => {
    const result = normalizePagination({ page: 3, page_size: 50 });
    expect(result.page).toBe(3);
    expect(result.page_size).toBe(50);
  });

  it('should default page to 1 when 0 or negative', () => {
    expect(normalizePagination({ page: 0 }).page).toBe(1);
    expect(normalizePagination({ page: -1 }).page).toBe(1);
  });

  it('should default page_size to 20 when 0 or negative', () => {
    expect(normalizePagination({ page_size: 0 }).page_size).toBe(20);
    expect(normalizePagination({ page_size: -5 }).page_size).toBe(20);
  });

  it('should have default PAGE=1 and PAGE_SIZE=20', () => {
    expect(PAGINATION_DEFAULTS.PAGE).toBe(1);
    expect(PAGINATION_DEFAULTS.PAGE_SIZE).toBe(20);
  });
});
