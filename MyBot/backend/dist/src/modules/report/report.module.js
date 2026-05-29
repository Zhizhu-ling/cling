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
exports.ReportModule = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const report_controller_1 = require("./report.controller");
const ai_module_1 = require("../ai/ai.module");
const outbox_module_1 = require("../outbox/outbox.module");
const ai_job_service_1 = require("../ai/ai-job.service");
const ai_client_1 = require("../ai/ai-client");
const enums_1 = require("../../domain/enums");
const report_job_handler_1 = require("./report-job.handler");
let ReportModule = class ReportModule {
    aiJobService;
    reportService;
    aiClient;
    constructor(aiJobService, reportService, aiClient) {
        this.aiJobService = aiJobService;
        this.reportService = reportService;
        this.aiClient = aiClient;
    }
    onModuleInit() {
        this.aiJobService.registerHandler(enums_1.AiJobType.REPORT_GENERATE, new report_job_handler_1.ReportJobHandler(this.reportService, this.aiClient));
    }
};
exports.ReportModule = ReportModule;
exports.ReportModule = ReportModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AiModule, outbox_module_1.OutboxModule],
        controllers: [report_controller_1.ReportController],
        providers: [report_service_1.ReportService],
        exports: [report_service_1.ReportService],
    }),
    __metadata("design:paramtypes", [ai_job_service_1.AiJobService,
        report_service_1.ReportService,
        ai_client_1.AiClient])
], ReportModule);
//# sourceMappingURL=report.module.js.map