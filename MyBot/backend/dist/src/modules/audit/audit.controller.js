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
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("../auth/guards");
const decorators_1 = require("../auth/decorators");
const prisma_1 = require("../../infra/prisma");
let AuditController = class AuditController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(page, pageSize, entityType, operation) {
        const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
        const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));
        const where = {};
        if (entityType) {
            where.entityType = entityType;
        }
        if (operation) {
            where.operation = operation;
        }
        const [list, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (pageNum - 1) * pageSizeNum,
                take: pageSizeNum,
                include: {
                    operator: {
                        select: { id: true, name: true },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            list,
            pagination: {
                page: pageNum,
                page_size: pageSizeNum,
                total,
            },
        };
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('page_size')),
    __param(2, (0, common_1.Query)('entity_type')),
    __param(3, (0, common_1.Query)('operation')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "findAll", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('audit-logs'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard, guards_1.RolesGuard),
    (0, decorators_1.Roles)('admin'),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map