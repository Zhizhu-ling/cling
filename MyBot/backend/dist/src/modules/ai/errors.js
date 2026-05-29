"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessValidationError = exports.TimeoutError = exports.ParseError = exports.NetworkError = exports.AiError = void 0;
class AiError extends Error {
    rawResponse;
    constructor(message, rawResponse) {
        super(message);
        this.name = 'AiError';
        this.rawResponse = rawResponse;
    }
}
exports.AiError = AiError;
class NetworkError extends AiError {
    constructor(message, rawResponse) {
        super(message, rawResponse);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
class ParseError extends AiError {
    constructor(message, rawResponse) {
        super(message, rawResponse);
        this.name = 'ParseError';
    }
}
exports.ParseError = ParseError;
class TimeoutError extends AiError {
    constructor(message, rawResponse) {
        super(message, rawResponse);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class BusinessValidationError extends AiError {
    constructor(message, rawResponse) {
        super(message, rawResponse);
        this.name = 'BusinessValidationError';
    }
}
exports.BusinessValidationError = BusinessValidationError;
//# sourceMappingURL=errors.js.map