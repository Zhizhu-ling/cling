"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_DEFAULTS = void 0;
exports.normalizePagination = normalizePagination;
exports.PAGINATION_DEFAULTS = {
    PAGE: 1,
    PAGE_SIZE: 20,
};
function normalizePagination(query) {
    return {
        page: query.page && query.page > 0 ? query.page : exports.PAGINATION_DEFAULTS.PAGE,
        page_size: query.page_size && query.page_size > 0
            ? query.page_size
            : exports.PAGINATION_DEFAULTS.PAGE_SIZE,
    };
}
//# sourceMappingURL=api-response.interface.js.map