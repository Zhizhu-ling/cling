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
exports.UpdateRequirementDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const enums_1 = require("../../../domain/enums");
class UpdateRequirementDto {
    title;
    background;
    objective;
    constraints;
    deliverables;
    priority;
    due_date;
    status;
    project_id;
}
exports.UpdateRequirementDto = UpdateRequirementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'title cannot be empty' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'background cannot be empty' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "background", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'objective cannot be empty' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "objective", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "constraints", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'deliverables must be an array' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateRequirementDto.prototype, "deliverables", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: 'priority must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' }),
    (0, class_validator_1.Max)(4, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateRequirementDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'due_date must be a valid date string (ISO 8601)' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "due_date", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.RequirementStatus, {
        message: `status must be one of: ${Object.values(enums_1.RequirementStatus).join(', ')}`,
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRequirementDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateRequirementDto.prototype, "project_id", void 0);
//# sourceMappingURL=update-requirement.dto.js.map