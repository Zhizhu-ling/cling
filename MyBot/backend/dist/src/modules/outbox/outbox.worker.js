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
var OutboxWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxWorker = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_1 = require("../../infra/prisma");
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;
const BATCH_SIZE = 20;
let OutboxWorker = OutboxWorker_1 = class OutboxWorker {
    prisma;
    eventEmitter;
    logger = new common_1.Logger(OutboxWorker_1.name);
    isProcessing = false;
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
    }
    onModuleDestroy() {
        this.isProcessing = false;
    }
    async pollAndDispatch() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;
        try {
            await this.processPendingEvents();
        }
        catch (error) {
            this.logger.error('Error in outbox polling cycle', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processPendingEvents() {
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
    async dispatchEvent(event) {
        try {
            this.eventEmitter.emit(event.eventType, {
                eventType: event.eventType,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId,
                payload: event.payload,
                outboxEventId: event.id,
            });
            await this.prisma.outboxEvent.update({
                where: { id: event.id },
                data: {
                    status: 'sent',
                    sentAt: new Date(),
                },
            });
            this.logger.debug(`Outbox event dispatched: ${event.eventType} (id=${event.id})`);
        }
        catch (error) {
            const newRetryCount = event.retryCount + 1;
            if (newRetryCount >= MAX_RETRIES) {
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'failed',
                        retryCount: newRetryCount,
                    },
                });
                this.logger.warn(`Outbox event permanently failed after ${MAX_RETRIES} retries: ${event.eventType} (id=${event.id})`);
            }
            else {
                const backoffMs = BASE_BACKOFF_MS * Math.pow(2, newRetryCount - 1);
                const nextRetryAt = new Date(Date.now() + backoffMs);
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        retryCount: newRetryCount,
                        nextRetryAt,
                    },
                });
                this.logger.warn(`Outbox event dispatch failed (retry ${newRetryCount}/${MAX_RETRIES}), next retry at ${nextRetryAt.toISOString()}: ${event.eventType} (id=${event.id})`, error instanceof Error ? error.message : error);
            }
        }
    }
};
exports.OutboxWorker = OutboxWorker;
__decorate([
    (0, schedule_1.Interval)(5000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OutboxWorker.prototype, "pollAndDispatch", null);
exports.OutboxWorker = OutboxWorker = OutboxWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        event_emitter_1.EventEmitter2])
], OutboxWorker);
//# sourceMappingURL=outbox.worker.js.map