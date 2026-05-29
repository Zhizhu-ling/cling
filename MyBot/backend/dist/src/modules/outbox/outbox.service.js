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
var OutboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../infra/prisma");
let OutboxService = OutboxService_1 = class OutboxService {
    prisma;
    logger = new common_1.Logger(OutboxService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async writeEvent(tx, data) {
        const event = await tx.outboxEvent.create({
            data: {
                eventType: data.eventType,
                aggregateType: data.aggregateType,
                aggregateId: BigInt(data.aggregateId),
                payload: data.payload,
                status: 'pending',
                retryCount: 0,
            },
        });
        this.logger.debug(`Outbox event written: ${data.eventType} for ${data.aggregateType}#${data.aggregateId} (id=${event.id})`);
        return event;
    }
    async writeEventStandalone(data) {
        const event = await this.prisma.outboxEvent.create({
            data: {
                eventType: data.eventType,
                aggregateType: data.aggregateType,
                aggregateId: BigInt(data.aggregateId),
                payload: data.payload,
                status: 'pending',
                retryCount: 0,
            },
        });
        this.logger.debug(`Outbox event written (standalone): ${data.eventType} for ${data.aggregateType}#${data.aggregateId} (id=${event.id})`);
        return event;
    }
};
exports.OutboxService = OutboxService;
exports.OutboxService = OutboxService = OutboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], OutboxService);
//# sourceMappingURL=outbox.service.js.map