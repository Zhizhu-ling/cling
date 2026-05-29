import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infra/prisma';

/**
 * Maximum number of retry attempts before marking an event as permanently failed.
 */
const MAX_RETRIES = 5;

/**
 * Base delay in milliseconds for exponential backoff (2 seconds).
 */
const BASE_BACKOFF_MS = 2000;

/**
 * Number of pending events to process per polling cycle.
 */
const BATCH_SIZE = 20;

/**
 * OutboxWorker is a background worker that periodically scans the outbox table
 * for pending events, dispatches them via EventEmitter2, and marks them as sent
 * or handles failures with exponential backoff retry logic.
 */
@Injectable()
export class OutboxWorker implements OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleDestroy() {
    // Ensure no lingering state on shutdown
    this.isProcessing = false;
  }

  /**
   * Polls for pending outbox events every 5 seconds.
   * Uses a guard flag to prevent overlapping executions.
   */
  @Interval(5000)
  async pollAndDispatch() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      await this.processPendingEvents();
    } catch (error) {
      this.logger.error('Error in outbox polling cycle', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Scans for pending events that are ready to be dispatched and processes them.
   */
  private async processPendingEvents() {
    const now = new Date();

    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'pending',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (pendingEvents.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${pendingEvents.length} pending outbox events`);

    for (const event of pendingEvents) {
      await this.dispatchEvent(event);
    }
  }

  /**
   * Dispatches a single outbox event via EventEmitter2.
   * On success, marks the event as 'sent' with a timestamp.
   * On failure, increments retry count and applies exponential backoff,
   * or marks as 'failed' if max retries exceeded.
   */
  private async dispatchEvent(event: {
    id: bigint;
    eventType: string;
    aggregateType: string;
    aggregateId: bigint;
    payload: any;
    retryCount: number;
  }) {
    try {
      // Emit the event via EventEmitter2
      // Listeners can subscribe to specific event types
      this.eventEmitter.emit(event.eventType, {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        outboxEventId: event.id,
      });

      // Mark as sent
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.debug(
        `Outbox event dispatched: ${event.eventType} (id=${event.id})`,
      );
    } catch (error) {
      const newRetryCount = event.retryCount + 1;

      if (newRetryCount >= MAX_RETRIES) {
        // Max retries exceeded - mark as permanently failed
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'failed',
            retryCount: newRetryCount,
          },
        });

        this.logger.warn(
          `Outbox event permanently failed after ${MAX_RETRIES} retries: ${event.eventType} (id=${event.id})`,
        );
      } else {
        // Calculate exponential backoff: base * 2^retryCount
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, newRetryCount - 1);
        const nextRetryAt = new Date(Date.now() + backoffMs);

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            retryCount: newRetryCount,
            nextRetryAt,
          },
        });

        this.logger.warn(
          `Outbox event dispatch failed (retry ${newRetryCount}/${MAX_RETRIES}), next retry at ${nextRetryAt.toISOString()}: ${event.eventType} (id=${event.id})`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
}
