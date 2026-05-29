import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory TTL cache for idempotency keys.
 * Stores keys with expiration timestamps and periodically cleans up expired entries.
 */
class IdempotencyCache {
  private cache = new Map<string, { timestamp: number }>();
  private readonly ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  set(key: string): void {
    this.cache.set(key, { timestamp: Date.now() });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/** Default TTL: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** HTTP methods that are considered write operations */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Idempotency middleware that prevents duplicate write requests.
 *
 * Reads the `X-Idempotency-Key` header from incoming requests.
 * - If the key has been seen before (within TTL), returns 409 Conflict.
 * - If the key is new, allows the request through and caches the key.
 * - Only applies to POST/PUT/PATCH/DELETE methods.
 * - Skips if no X-Idempotency-Key header is present.
 *
 * Validates: Requirements 11.4
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly cache: IdempotencyCache;

  constructor() {
    const ttlMs = parseInt(process.env.IDEMPOTENCY_TTL_MS || '', 10) || DEFAULT_TTL_MS;
    this.cache = new IdempotencyCache(ttlMs);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Only apply to write methods
    if (!WRITE_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    // Skip if no idempotency key header is present
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    if (!idempotencyKey) {
      next();
      return;
    }

    // Check if key has been seen before
    if (this.cache.has(idempotencyKey)) {
      res.status(409).json({
        code: 409,
        message: 'Duplicate request',
        data: null,
        request_id: req.headers['x-request-id'] || null,
      });
      return;
    }

    // Store the key and allow the request through
    this.cache.set(idempotencyKey);
    next();
  }
}
