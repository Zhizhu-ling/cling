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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AiClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("./errors");
let AiClient = AiClient_1 = class AiClient {
    configService;
    logger = new common_1.Logger(AiClient_1.name);
    endpoint;
    apiKey;
    modelName;
    timeoutMs;
    constructor(configService) {
        this.configService = configService;
        this.endpoint = this.configService.get('app.ai.modelEndpoint', 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
        this.apiKey = this.configService.get('app.ai.apiKey', '');
        this.modelName = this.configService.get('app.ai.modelName', 'qwen-plus');
        this.timeoutMs = this.configService.get('app.ai.timeoutMs', 60000);
    }
    async chat(prompt, systemPrompt) {
        if (!this.apiKey) {
            this.logger.warn('AI_API_KEY 未配置，使用模拟响应');
            throw new errors_1.NetworkError('AI_API_KEY not configured');
        }
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        this.logger.log(`调用 AI 模型: ${this.modelName}, prompt 长度: ${prompt.length} 字符`);
        try {
            const response = await axios_1.default.post(this.endpoint, {
                model: this.modelName,
                messages,
                temperature: 0.7,
                response_format: { type: 'json_object' },
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                timeout: this.timeoutMs,
            });
            const content = response.data?.choices?.[0]?.message?.content;
            if (!content) {
                throw new errors_1.NetworkError('AI 模型返回空响应');
            }
            this.logger.log(`AI 响应成功，长度: ${content.length} 字符，tokens: ${JSON.stringify(response.data?.usage ?? {})}`);
            return content;
        }
        catch (error) {
            if (error instanceof errors_1.NetworkError || error instanceof errors_1.TimeoutError) {
                throw error;
            }
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new errors_1.TimeoutError(`AI 模型调用超时 (${this.timeoutMs}ms)`);
            }
            if (error.response) {
                const status = error.response.status;
                const msg = error.response.data?.error?.message || error.message;
                this.logger.error(`AI API 错误 [${status}]: ${msg}`);
                throw new errors_1.NetworkError(`AI API 错误 [${status}]: ${msg}`);
            }
            throw new errors_1.NetworkError(`AI 调用失败: ${error.message}`);
        }
    }
};
exports.AiClient = AiClient;
exports.AiClient = AiClient = AiClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AiClient);
//# sourceMappingURL=ai-client.js.map