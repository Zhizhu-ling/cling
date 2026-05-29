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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../infra/prisma");
const auth_service_1 = require("../auth/auth.service");
const enums_1 = require("../../domain/enums");
const constants_1 = require("../../domain/constants");
const api_response_interface_1 = require("../../common/interfaces/api-response.interface");
let UserService = class UserService {
    prisma;
    authService;
    constructor(prisma, authService) {
        this.prisma = prisma;
        this.authService = authService;
    }
    async createUser(dto) {
        const existingUsername = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existingUsername) {
            throw new common_1.BadRequestException({
                code: constants_1.ErrorCodes.VALIDATION_ERROR,
                message: 'Username already exists',
            });
        }
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingEmail) {
            throw new common_1.BadRequestException({
                code: constants_1.ErrorCodes.VALIDATION_ERROR,
                message: 'Email already exists',
            });
        }
        const passwordHash = await this.authService.hashPassword(dto.password);
        const user = await this.prisma.user.create({
            data: {
                username: dto.username,
                passwordHash,
                name: dto.name,
                role: dto.role,
                email: dto.email,
                phone: dto.phone ?? null,
                avatar: dto.avatar ?? null,
                status: enums_1.UserStatus.ACTIVE,
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                email: true,
                phone: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            ...user,
            id: user.id.toString(),
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
    async findAll(query) {
        const { page, page_size } = (0, api_response_interface_1.normalizePagination)(query);
        const where = {};
        if (query.role) {
            where.role = query.role;
        }
        if (query.status) {
            where.status = query.status;
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: (page - 1) * page_size,
                take: page_size,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    role: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            list: users.map((user) => ({
                ...user,
                id: user.id.toString(),
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
            })),
            pagination: {
                page,
                page_size,
                total,
            },
        };
    }
    async updateUser(id, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException({
                code: constants_1.ErrorCodes.NOT_FOUND,
                message: 'User not found',
            });
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: {
                ...(dto.role !== undefined && { role: dto.role }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.avatar !== undefined && { avatar: dto.avatar }),
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                email: true,
                phone: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            ...updatedUser,
            id: updatedUser.id.toString(),
            createdAt: updatedUser.createdAt.toISOString(),
            updatedAt: updatedUser.updatedAt.toISOString(),
        };
    }
    async deactivateUser(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException({
                code: constants_1.ErrorCodes.NOT_FOUND,
                message: 'User not found',
            });
        }
        if (user.status === enums_1.UserStatus.DISABLED) {
            throw new common_1.BadRequestException({
                code: constants_1.ErrorCodes.VALIDATION_ERROR,
                message: 'User is already deactivated',
            });
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { status: enums_1.UserStatus.DISABLED },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                email: true,
                phone: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return {
            ...updatedUser,
            id: updatedUser.id.toString(),
            createdAt: updatedUser.createdAt.toISOString(),
            updatedAt: updatedUser.updatedAt.toISOString(),
        };
    }
    async deleteUser(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException({ code: constants_1.ErrorCodes.NOT_FOUND, message: '用户不存在' });
        }
        const taskCount = await this.prisma.task.count({ where: { ownerId: id } });
        if (taskCount > 0) {
            throw new common_1.BadRequestException({
                code: constants_1.ErrorCodes.VALIDATION_ERROR,
                message: '该用户有关联的任务，不能删除。请先将任务重新分配或禁用该用户。',
            });
        }
        await this.prisma.user.delete({ where: { id } });
        return { deleted: true };
    }
    async updateMyProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException({ code: constants_1.ErrorCodes.NOT_FOUND, message: '用户不存在' });
        }
        if (dto.username && dto.username !== user.username) {
            const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
            if (existing) {
                throw new common_1.BadRequestException({
                    code: constants_1.ErrorCodes.VALIDATION_ERROR,
                    message: '用户名已存在',
                });
            }
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.username !== undefined && { username: dto.username }),
            },
            select: { id: true, username: true, name: true, role: true, email: true, status: true },
        });
        return { ...updated, id: updated.id.toString() };
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException({ code: constants_1.ErrorCodes.NOT_FOUND, message: '用户不存在' });
        }
        const bcrypt = await import('bcrypt');
        const isValid = await bcrypt.compare(dto.old_password, user.passwordHash);
        if (!isValid) {
            throw new common_1.BadRequestException({
                code: constants_1.ErrorCodes.VALIDATION_ERROR,
                message: '当前密码不正确',
            });
        }
        const newHash = await this.authService.hashPassword(dto.new_password);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        });
        return { success: true, message: '密码修改成功' };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        auth_service_1.AuthService])
], UserService);
//# sourceMappingURL=user.service.js.map