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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const ai_job_service_1 = require("./ai-job.service");
const ai_client_1 = require("./ai-client");
const guards_1 = require("../auth/guards");
let AiController = class AiController {
    aiService;
    aiJobService;
    aiClient;
    constructor(aiService, aiJobService, aiClient) {
        this.aiService = aiService;
        this.aiJobService = aiJobService;
        this.aiClient = aiClient;
    }
    async getStatus() {
        try {
            const response = await this.aiClient.chat('请回复"ok"', '你是一个测试助手，只需回复JSON格式：{"status":"ok"}');
            return { available: true, model: process.env.AI_MODEL_NAME || 'qwen-plus' };
        }
        catch (error) {
            return { available: false, model: process.env.AI_MODEL_NAME || 'qwen-plus', error: error.message };
        }
    }
    async getJob(id) {
        return this.aiJobService.getJob(id);
    }
    async cancelJob(id) {
        await this.aiJobService.cancelJob(id);
        return { id, status: 'canceled' };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getJob", null);
__decorate([
    (0, common_1.Post)('jobs/:id/cancel'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "cancelJob", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        ai_job_service_1.AiJobService,
        ai_client_1.AiClient])
], AiController);
//# sourceMappingURL=ai.controller.js.map