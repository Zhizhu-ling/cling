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
var AiJobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiJobService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../infra/prisma");
const enums_1 = require("../../domain/enums");
const state_machines_1 = require("../../domain/state-machines");
const config_1 = require("./config");
let AiJobService = AiJobService_1 = class AiJobService {
    prisma;
    logger = new common_1.Logger(AiJobService_1.name);
    handlers = new Map();
    constructor(prisma) {
        this.prisma = prisma;
    }
    registerHandler(jobType, handler) {
        this.handlers.set(jobType, handler);
        this.logger.log(`Registered AI job handler for type: ${jobType}`);
    }
    async createJob(dto) {
        const versionConfig = (0, config_1.getPromptVersionConfig)(dto.jobType, dto.templateName);
        const job = await this.prisma.aiJob.create({
            data: {
                jobType: dto.jobType,
                status: enums_1.AiJobStatus.PENDING,
                requestId: dto.requestId,
                bizRefId: dto.bizRefId ?? null,
                inputPayload: dto.inputPayload,
                promptVersion: versionConfig.promptVersion,
                schemaVersion: versionConfig.schemaVersion,
                maxRetry: dto.maxRetry ?? 3,
                createdBy: dto.createdBy,
            },
        });
        this.logger.log(`Created AI job ${job.id} (type=${dto.jobType}, promptVersion=${versionConfig.promptVersion}, schemaVersion=${versionConfig.schemaVersion}, template=${versionConfig.templateName})`);
        return job.id.toString();
    }
    dispatchJob(jobId) {
        this.logger.log(`Dispatching AI job ${jobId} for processing`);
        setImmediate(() => {
            this.processJob(jobId).catch((err) => {
                this.logger.error(`Unhandled error processing AI job ${jobId}: ${err.message}`, err.stack);
            });
        });
    }
    async createAndDispatch(dto) {
        const jobId = await this.createJob(dto);
        this.dispatchJob(jobId);
        return jobId;
    }
    async getJob(jobId) {
        const job = await this.prisma.aiJob.findUnique({
            where: { id: BigInt(jobId) },
        });
        if (!job) {
            throw new common_1.NotFoundException(`AI job ${jobId} not found`);
        }
        return {
            id: job.id.toString(),
            jobType: job.jobType,
            status: job.status,
            requestId: job.requestId,
            bizRefId: job.bizRefId?.toString() ?? null,
            inputPayload: job.inputPayload,
            outputPayload: job.outputPayload,
            rawResponse: job.rawResponse,
            promptVersion: job.promptVersion,
            schemaVersion: job.schemaVersion,
            retryCount: job.retryCount,
            maxRetry: job.maxRetry,
            errorMessage: job.errorMessage,
            createdBy: job.createdBy.toString(),
            createdAt: job.createdAt.toISOString(),
            startedAt: job.startedAt?.toISOString() ?? null,
            completedAt: job.completedAt?.toISOString() ?? null,
        };
    }
    async cancelJob(jobId) {
        const job = await this.prisma.aiJob.findUnique({
            where: { id: BigInt(jobId) },
        });
        if (!job) {
            throw new common_1.NotFoundException(`AI job ${jobId} not found`);
        }
        const currentStatus = job.status;
        const validation = state_machines_1.AiJobStateMachine.validateTransition(currentStatus, enums_1.AiJobStatus.CANCELED);
        if (!validation.valid) {
            throw new Error(validation.error ?? `Cannot cancel job in status '${currentStatus}'`);
        }
        await this.prisma.aiJob.update({
            where: { id: BigInt(jobId) },
            data: {
                status: enums_1.AiJobStatus.CANCELED,
                completedAt: new Date(),
            },
        });
        this.logger.log(`Canceled AI job ${jobId}`);
    }
    async processJob(jobId) {
        const job = await this.prisma.aiJob.findUnique({
            where: { id: BigInt(jobId) },
        });
        if (!job) {
            this.logger.error(`AI job ${jobId} not found during processing`);
            return;
        }
        const currentStatus = job.status;
        const toRunningValidation = state_machines_1.AiJobStateMachine.validateTransition(currentStatus, enums_1.AiJobStatus.RUNNING);
        if (!toRunningValidation.valid) {
            this.logger.warn(`Cannot transition AI job ${jobId} to running: ${toRunningValidation.error}`);
            return;
        }
        await this.prisma.aiJob.update({
            where: { id: BigInt(jobId) },
            data: {
                status: enums_1.AiJobStatus.RUNNING,
                startedAt: new Date(),
            },
        });
        this.logger.log(`AI job ${jobId} is now running`);
        const jobType = job.jobType;
        const handler = this.handlers.get(jobType);
        try {
            if (!handler) {
                throw new Error(`No handler registered for AI job type: ${jobType}`);
            }
            const result = await handler.execute(job.inputPayload);
            const toSuccessValidation = state_machines_1.AiJobStateMachine.validateTransition(enums_1.AiJobStatus.RUNNING, enums_1.AiJobStatus.SUCCESS);
            if (!toSuccessValidation.valid) {
                this.logger.error(`Cannot transition AI job ${jobId} to success: ${toSuccessValidation.error}`);
                return;
            }
            await this.prisma.aiJob.update({
                where: { id: BigInt(jobId) },
                data: {
                    status: enums_1.AiJobStatus.SUCCESS,
                    outputPayload: result.outputPayload,
                    rawResponse: result.rawResponse ?? null,
                    completedAt: new Date(),
                },
            });
            this.logger.log(`AI job ${jobId} completed successfully`);
        }
        catch (error) {
            this.logger.error(`AI job ${jobId} failed: ${error.message}`, error.stack);
            const toFailValidation = state_machines_1.AiJobStateMachine.validateTransition(enums_1.AiJobStatus.RUNNING, enums_1.AiJobStatus.FAIL);
            if (!toFailValidation.valid) {
                this.logger.error(`Cannot transition AI job ${jobId} to fail: ${toFailValidation.error}`);
                return;
            }
            await this.prisma.aiJob.update({
                where: { id: BigInt(jobId) },
                data: {
                    status: enums_1.AiJobStatus.FAIL,
                    errorMessage: error.message,
                    retryCount: { increment: 1 },
                    completedAt: new Date(),
                },
            });
        }
    }
};
exports.AiJobService = AiJobService;
exports.AiJobService = AiJobService = AiJobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], AiJobService);
//# sourceMappingURL=ai-job.service.js.map