export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
    request_id: string;
}
export interface PaginatedList<T> {
    list: T[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
    };
}
export interface PaginationQuery {
    page?: number;
    page_size?: number;
}
export declare const PAGINATION_DEFAULTS: {
    readonly PAGE: 1;
    readonly PAGE_SIZE: 20;
};
export declare function normalizePagination(query: PaginationQuery): {
    page: number;
    page_size: number;
};
