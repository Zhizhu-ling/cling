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
exports.ConfirmSplitDto = exports.ConfirmSplitTaskDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ConfirmSplitTaskDto {
    task_key;
    title;
    description;
    estimated_hours;
    dependencies;
    acceptance_criteria;
    parent_key;
}
exports.ConfirmSplitTaskDto = ConfirmSplitTaskDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'task_key is required' }),
    __metadata("design:type", String)
], ConfirmSplitTaskDto.prototype, "task_key", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'title is required' }),
    __metadata("design:type", String)
], ConfirmSplitTaskDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConfirmSplitTaskDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({}, { message: 'estimated_hours must be a number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ConfirmSplitTaskDto.prototype, "estimated_hours", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ConfirmSplitTaskDto.prototype, "dependencies", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConfirmSplitTaskDto.prototype, "acceptance_criteria", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ConfirmSplitTaskDto.prototype, "parent_key", void 0);
class ConfirmSplitDto {
    tasks;
}
exports.ConfirmSplitDto = ConfirmSplitDto;
__decorate([
    (0, class_validator_1.IsArray)({ message: 'tasks must be an array' }),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'tasks must contain at least one task' }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConfirmSplitTaskDto),
    __metadata("design:type", Array)
], ConfirmSplitDto.prototype, "tasks", void 0);
//# sourceMappingURL=confirm-split.dto.js.map