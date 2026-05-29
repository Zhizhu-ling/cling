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
exports.TaskController = void 0;
const common_1 = require("@nestjs/common");
const task_service_1 = require("./task.service");
const guards_1 = require("../auth/guards");
const decorators_1 = require("../auth/decorators");
const dto_1 = require("./dto");
const create_task_comment_dto_1 = require("./dto/create-task-comment.dto");
let TaskController = class TaskController {
    taskService;
    constructor(taskService) {
        this.taskService = taskService;
    }
    async findAll(query) {
        return this.taskService.findAll(query);
    }
    async findOne(id) {
        return this.taskService.findOne(BigInt(id));
    }
    async suggestAssignment(dto, user) {
        return this.taskService.suggestAssignment(dto.task_ids, user.userId);
    }
    async assignTasks(dto) {
        return this.taskService.assignTasks(dto.assignments);
    }
    async updateTaskStatus(id, dto, user) {
        return this.taskService.updateTaskStatus(BigInt(id), dto.status, user.userId, user.role, {
            progress: dto.progress,
            note: dto.note,
            blocked_reason: dto.blocked_reason,
        });
    }
    async getComments(id) {
        return this.taskService.getComments(BigInt(id));
    }
    async addComment(id, dto, user) {
        return this.taskService.addComment(BigInt(id), dto.content, user.userId);
    }
};
exports.TaskController = TaskController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.TaskQueryDto]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('assignment-suggest'),
    (0, decorators_1.Roles)('manager', 'admin'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AssignmentSuggestDto, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "suggestAssignment", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, decorators_1.Roles)('manager', 'admin'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AssignTaskDto]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "assignTasks", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dto_1.UpdateTaskStatusDto, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "updateTaskStatus", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_task_comment_dto_1.CreateTaskCommentDto, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "addComment", null);
exports.TaskController = TaskController = __decorate([
    (0, common_1.Controller)('tasks'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    __metadata("design:paramtypes", [task_service_1.TaskService])
], TaskController);
//# sourceMappingURL=task.controller.js.map