"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyMiddleware = void 0;
const common_1 = require("@nestjs/common");
class IdempotencyCache {
    cache = new Map();
    ttlMs;
    cleanupInterval = null;
    constructor(ttlMs) {
        this.ttlMs = ttlMs;
        this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    set(key) {
        this.cache.set(key, { timestamp: Date.now() });
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
            }
        }
    }
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }
}
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let IdempotencyMiddleware = class IdempotencyMiddleware {
    cache;
    constructor() {
        const ttlMs = parseInt(process.env.IDEMPOTENCY_TTL_MS || '', 10) || DEFAULT_TTL_MS;
        this.cache = new IdempotencyCache(ttlMs);
    }
    use(req, res, next) {
        if (!WRITE_METHODS.has(req.method.toUpperCase())) {
            next();
            return;
        }
        const idempotencyKey = req.headers['x-idempotency-key'];
        if (!idempotencyKey) {
            next();
            return;
        }
        if (this.cache.has(idempotencyKey)) {
            res.status(409).json({
                code: 409,
                message: 'Duplicate request',
                data: null,
                request_id: req.headers['x-request-id'] || null,
            });
            return;
        }
        this.cache.set(idempotencyKey);
        next();
    }
};
exports.IdempotencyMiddleware = IdempotencyMiddleware;
exports.IdempotencyMiddleware = IdempotencyMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], IdempotencyMiddleware);
//# sourceMappingURL=idempotency.middleware.js.map