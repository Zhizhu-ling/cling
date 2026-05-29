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
exports.CreateRequirementDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateRequirementDto {
    title;
    background;
    objective;
    constraints;
    deliverables;
    priority;
    due_date;
    project_id;
}
exports.CreateRequirementDto = CreateRequirementDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'title is required' }),
    __metadata("design:type", String)
], CreateRequirementDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'background is required' }),
    __metadata("design:type", String)
], CreateRequirementDto.prototype, "background", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'objective is required' }),
    __metadata("design:type", String)
], CreateRequirementDto.prototype, "objective", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRequirementDto.prototype, "constraints", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: 'deliverables must be an array' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'deliverables is required' }),
    __metadata("design:type", Array)
], CreateRequirementDto.prototype, "deliverables", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: 'priority must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' }),
    (0, class_validator_1.Max)(4, { message: 'priority must be between 1 and 4 (1=critical, 2=high, 3=medium, 4=low)' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequirementDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'due_date must be a valid date string (ISO 8601)' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'due_date is required' }),
    __metadata("design:type", String)
], CreateRequirementDto.prototype, "due_date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRequirementDto.prototype, "project_id", void 0);
//# sourceMappingURL=create-requirement.dto.js.map