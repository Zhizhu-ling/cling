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
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const ai_job_service_1 = require("./ai-job.service");
const ai_client_1 = require("./ai-client");
const ai_controller_1 = require("./ai.controller");
const enums_1 = require("../../domain/enums");
const handlers_1 = require("./handlers");
let AiModule = class AiModule {
    aiJobService;
    aiClient;
    constructor(aiJobService, aiClient) {
        this.aiJobService = aiJobService;
        this.aiClient = aiClient;
    }
    onModuleInit() {
        this.aiJobService.registerHandler(enums_1.AiJobType.REQUIREMENT_SPLIT, new handlers_1.RequirementSplitHandler(this.aiClient));
        this.aiJobService.registerHandler(enums_1.AiJobType.ASSIGNMENT_SUGGEST, new handlers_1.AssignmentSuggestHandler(this.aiClient));
        this.aiJobService.registerHandler(enums_1.AiJobType.REPORT_GENERATE, new handlers_1.ReportGenerateHandler(this.aiClient));
    }
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        controllers: [ai_controller_1.AiController],
        providers: [ai_service_1.AiService, ai_job_service_1.AiJobService, ai_client_1.AiClient],
        exports: [ai_service_1.AiService, ai_job_service_1.AiJobService, ai_client_1.AiClient],
    }),
    __metadata("design:paramtypes", [ai_job_service_1.AiJobService,
        ai_client_1.AiClient])
], AiModule);
//# sourceMappingURL=ai.module.js.map