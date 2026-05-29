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
exports.UpdateTaskStatusDto = void 0;
const class_validator_1 = require("class-validator");
const task_status_enum_1 = require("../../../domain/enums/task-status.enum");
class UpdateTaskStatusDto {
    status;
    progress;
    note;
    blocked_reason;
}
exports.UpdateTaskStatusDto = UpdateTaskStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(task_status_enum_1.TaskStatus, {
        message: `status must be one of: ${Object.values(task_status_enum_1.TaskStatus).join(', ')}`,
    }),
    __metadata("design:type", String)
], UpdateTaskStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'progress must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'progress must be at least 0' }),
    (0, class_validator_1.Max)(100, { message: 'progress must be at most 100' }),
    __metadata("design:type", Number)
], UpdateTaskStatusDto.prototype, "progress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'note must be a string' }),
    __metadata("design:type", String)
], UpdateTaskStatusDto.prototype, "note", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'blocked_reason must be a string' }),
    __metadata("design:type", String)
], UpdateTaskStatusDto.prototype, "blocked_reason", void 0);
//# sourceMappingURL=update-task-status.dto.js.map