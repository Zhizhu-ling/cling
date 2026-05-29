"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryExhaustedError = void 0;
exports.getMaxRetriesForError = getMaxRetriesForError;
exports.calculateBackoffDelay = calculateBackoffDelay;
exports.sleep = sleep;
exports.executeWithRetry = executeWithRetry;
const errors_1 = require("./errors");
class RetryExhaustedError extends errors_1.AiError {
    lastError;
    totalAttempts;
    constructor(lastError, totalAttempts) {
        super(`All retries exhausted after ${totalAttempts} attempt(s): ${lastError.message}`, lastError.rawResponse);
        this.name = 'RetryExhaustedError';
        this.lastError = lastError;
        this.totalAttempts = totalAttempts;
    }
}
exports.RetryExhaustedError = RetryExhaustedError;
const DEFAULT_RETRY_CONFIG = {
    networkMaxRetries: 2,
    parseMaxRetries: 1,
    timeoutMaxRetries: 1,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};
function getMaxRetriesForError(error, config) {
    if (error instanceof errors_1.BusinessValidationError) {
        return 0;
    }
    if (error instanceof errors_1.NetworkError) {
        return config.networkMaxRetries;
    }
    if (error instanceof errors_1.ParseError) {
        return config.parseMaxRetries;
    }
    if (error instanceof errors_1.TimeoutError) {
        return config.timeoutMaxRetries;
    }
    return 0;
}
function calculateBackoffDelay(attempt, config) {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * config.baseDelayMs * 0.5;
    return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function executeWithRetry(fn, config = {}, delayFn = sleep) {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let attempts = 0;
    let lastError;
    const absoluteMaxAttempts = 1 +
        Math.max(fullConfig.networkMaxRetries, fullConfig.parseMaxRetries, fullConfig.timeoutMaxRetries);
    while (attempts < absoluteMaxAttempts) {
        attempts++;
        try {
            const result = await fn();
            return { result, attempts };
        }
        catch (error) {
            if (!(error instanceof errors_1.AiError)) {
                throw error;
            }
            lastError = error;
            if (error instanceof errors_1.BusinessValidationError) {
                throw error;
            }
            const maxRetries = getMaxRetriesForError(error, fullConfig);
            const retriesMade = attempts - 1;
            if (retriesMade >= maxRetries) {
                throw new RetryExhaustedError(error, attempts);
            }
            const delay = calculateBackoffDelay(retriesMade, fullConfig);
            await delayFn(delay);
        }
    }
    throw new RetryExhaustedError(lastError ?? new errors_1.AiError('Unknown error'), attempts);
}
//# sourceMappingURL=retry-strategy.js.map