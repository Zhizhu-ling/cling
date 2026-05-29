import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to mark endpoints as idempotent.
 */
export const IDEMPOTENT_KEY = 'isIdempotent';

/**
 * Decorator to mark an endpoint as idempotent.
 * When applied, the IdempotencyMiddleware will enforce idempotency
 * for requests to this endpoint that include an X-Idempotency-Key header.
 *
 * Usage:
 * ```typescript
 * @Post(':id/status')
 * @Idempotent()
 * updateStatus(@Body() dto: UpdateStatusDto) { ... }
 * ```
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
