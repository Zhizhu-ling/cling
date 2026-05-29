import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma';

/**
 * Data required to write an outbox event.
 */
export interface WriteEventData {
  eventType: string;
  aggregateType: string;
  aggregateId: bigint | number;
  payload: Record<string, unknown>;
}

/**
 * OutboxService handles writing domain events to the outbox table.
 * Events can be written within an existing Prisma transaction (for atomicity
 * with business operations) or standalone.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an outbox event within an existing Prisma transaction context.
   * This ensures the event is committed atomically with the business operation.
   *
   * @param tx - Prisma transaction client (from prisma.$transaction callback)
   * @param data - Event data to write
   */
  async writeEvent(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    data: WriteEventData,
  ) {
    const event = await tx.outboxEvent.create({
      data: {
        eventType: data.eventType,
        aggregateType: data.aggregateType,
        aggregateId: BigInt(data.aggregateId),
        payload: data.payload as any,
        status: 'pending',
        retryCount: 0,
      },
    });

    this.logger.debug(
      `Outbox event written: ${data.eventType} for ${data.aggregateType}#${data.aggregateId} (id=${event.id})`,
    );

    return event;
  }

  /**
   * Write an outbox event outside of a transaction (for simpler cases
   * where atomicity with other operations is not required).
   *
   * @param data - Event data to write
   */
  async writeEventStandalone(data: WriteEventData) {
    const event = await this.prisma.outboxEvent.create({
      data: {
        eventType: data.eventType,
        aggregateType: data.aggregateType,
        aggregateId: BigInt(data.aggregateId),
        payload: data.payload as any,
        status: 'pending',
        retryCount: 0,
      },
    });

    this.logger.debug(
      `Outbox event written (standalone): ${data.eventType} for ${data.aggregateType}#${data.aggregateId} (id=${event.id})`,
    );

    return event;
  }
}
