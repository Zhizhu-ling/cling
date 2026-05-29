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
exports.RequirementController = void 0;
const common_1 = require("@nestjs/common");
const requirement_service_1 = require("./requirement.service");
const guards_1 = require("../auth/guards");
const decorators_1 = require("../auth/decorators");
const create_requirement_dto_1 = require("./dto/create-requirement.dto");
const update_requirement_dto_1 = require("./dto/update-requirement.dto");
const requirement_query_dto_1 = require("./dto/requirement-query.dto");
const confirm_split_dto_1 = require("./dto/confirm-split.dto");
let RequirementController = class RequirementController {
    requirementService;
    constructor(requirementService) {
        this.requirementService = requirementService;
    }
    async create(dto, user) {
        return this.requirementService.create(dto, user.userId);
    }
    async findAll(query) {
        return this.requirementService.findAll(query);
    }
    async findOne(id) {
        return this.requirementService.findOne(BigInt(id));
    }
    async update(id, dto) {
        return this.requirementService.update(BigInt(id), dto);
    }
    async split(id, user) {
        return this.requirementService.splitRequirement(BigInt(id), user.userId);
    }
    async confirmSplit(id, dto) {
        return this.requirementService.confirmSplit(BigInt(id), dto);
    }
    async remove(id) {
        return this.requirementService.remove(BigInt(id));
    }
};
exports.RequirementController = RequirementController;
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)('manager', 'admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_requirement_dto_1.CreateRequirementDto, Object]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requirement_query_dto_1.RequirementQueryDto]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, decorators_1.Roles)('manager', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_requirement_dto_1.UpdateRequirementDto]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/split'),
    (0, decorators_1.Roles)('manager', 'admin'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "split", null);
__decorate([
    (0, common_1.Post)(':id/confirm-split'),
    (0, decorators_1.Roles)('manager', 'admin'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, confirm_split_dto_1.ConfirmSplitDto]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "confirmSplit", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, decorators_1.Roles)('manager', 'admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], RequirementController.prototype, "remove", null);
exports.RequirementController = RequirementController = __decorate([
    (0, common_1.Controller)('requirements'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    __metadata("design:paramtypes", [requirement_service_1.RequirementService])
], RequirementController);
//# sourceMappingURL=requirement.controller.js.map