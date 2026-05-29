"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementModule = void 0;
const common_1 = require("@nestjs/common");
const requirement_service_1 = require("./requirement.service");
const requirement_controller_1 = require("./requirement.controller");
const prisma_1 = require("../../infra/prisma");
const ai_module_1 = require("../ai/ai.module");
const outbox_module_1 = require("../outbox/outbox.module");
let RequirementModule = class RequirementModule {
};
exports.RequirementModule = RequirementModule;
exports.RequirementModule = RequirementModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_1.PrismaModule, ai_module_1.AiModule, outbox_module_1.OutboxModule],
        controllers: [requirement_controller_1.RequirementController],
        providers: [requirement_service_1.RequirementService],
        exports: [requirement_service_1.RequirementService],
    })
], RequirementModule);
//# sourceMappingURL=requirement.module.js.map