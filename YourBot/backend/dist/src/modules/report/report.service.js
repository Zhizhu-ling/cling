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
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const prisma_1 = require("../../infra/prisma");
const enums_1 = require("../../domain/enums");
const interfaces_1 = require("../../common/interfaces");
const ai_job_service_1 = require("../ai/ai-job.service");
const outbox_service_1 = require("../outbox/outbox.service");
const event_types_1 = require("../../events/event-types");
let ReportService = class ReportService {
    prisma;
    aiJobService;
    outboxService;
    constructor(prisma, aiJobService, outboxService) {
        this.prisma = prisma;
        this.aiJobService = aiJobService;
        this.outboxService = outboxService;
    }
    async generateReport(dto, userId) {
        const jobId = await this.aiJobService.createAndDispatch({
            jobType: enums_1.AiJobType.REPORT_GENERATE,
            inputPayload: {
                report_type: dto.report_type,
                date_from: dto.date_from,
                date_to: dto.date_to,
                project_id: dto.project_id ?? null,
                created_by: userId.toString(),
            },
            createdBy: userId,
            requestId: (0, uuid_1.v4)(),
        });
        return { job_id: jobId };
    }
    async onReportJobSuccess(jobId, outputPayload, userId, inputPayload) {
        await this.prisma.$transaction(async (tx) => {
            const report = await tx.report.create({
                data: {
                    projectId: inputPayload.project_id
                        ? BigInt(inputPayload.project_id)
                        : null,
                    reportType: inputPayload.report_type,
                    dateFrom: new Date(inputPayload.date_from),
                    dateTo: new Date(inputPayload.date_to),
                    title: outputPayload.title || 'AI Generated Report',
                    summary: outputPayload.summary || null,
                    content: outputPayload.content || null,
                    riskSummary: outputPayload.risk_summary || null,
                    aiGenerated: true,
                    createdBy: userId,
                },
            });
            await this.outboxService.writeEvent(tx, {
                eventType: event_types_1.EventTypes.REPORT_GENERATED,
                aggregateType: 'report',
                aggregateId: report.id,
                payload: {
                    report_id: report.id.toString(),
                    report_type: report.reportType,
                    title: report.title,
                    ai_generated: true,
                    created_by: userId.toString(),
                },
            });
        });
    }
    async findAll(query) {
        const { page, page_size } = (0, interfaces_1.normalizePagination)(query);
        const where = {};
        if (query.report_type) {
            where.reportType = query.report_type;
        }
        if (query.date_from) {
            where.dateFrom = { ...(where.dateFrom || {}), gte: new Date(query.date_from) };
        }
        if (query.date_to) {
            where.dateTo = { ...(where.dateTo || {}), lte: new Date(query.date_to) };
        }
        const [list, total] = await Promise.all([
            this.prisma.report.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * page_size,
                take: page_size,
            }),
            this.prisma.report.count({ where }),
        ]);
        return {
            list,
            pagination: {
                page,
                page_size,
                total,
            },
        };
    }
    async findOne(id) {
        const report = await this.prisma.report.findUnique({
            where: { id },
        });
        if (!report) {
            throw new common_1.NotFoundException(`Report with id ${id} not found`);
        }
        return report;
    }
    async update(id, dto) {
        const existing = await this.prisma.report.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Report with id ${id} not found`);
        }
        const updateData = {};
        if (dto.title !== undefined)
            updateData.title = dto.title;
        if (dto.summary !== undefined)
            updateData.summary = dto.summary;
        if (dto.content !== undefined)
            updateData.content = dto.content;
        if (dto.risk_summary !== undefined)
            updateData.riskSummary = dto.risk_summary;
        const updated = await this.prisma.report.update({
            where: { id },
            data: updateData,
        });
        return updated;
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        ai_job_service_1.AiJobService,
        outbox_service_1.OutboxService])
], ReportService);
//# sourceMappingURL=report.service.js.map