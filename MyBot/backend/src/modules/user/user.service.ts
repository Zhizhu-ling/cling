import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserStatus } from '../../domain/enums';
import { ErrorCodes } from '../../domain/constants';
import {
  normalizePagination,
  PaginatedList,
} from '../../common/interfaces/api-response.interface';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new user with hashed password.
   * Validates username and email uniqueness.
   */
  async createUser(dto: CreateUserDto) {
    // Check username uniqueness
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Username already exists',
      });
    }

    // Check email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Email already exists',
      });
    }

    // Hash password using AuthService (bcrypt cost >= 10)
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
        status: UserStatus.ACTIVE,
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

  /**
   * Get paginated user list with optional filters (role, status).
   */
  async findAll(query: QueryUsersDto): Promise<PaginatedList<any>> {
    const { page, page_size } = normalizePagination(query);

    const where: Record<string, any> = {};
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

  /**
   * Update user role/status. Validates uniqueness if email changes.
   * Role change takes effect immediately since JWT validates against DB on each request.
   */
  async updateUser(id: bigint, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
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

  /**
   * Deactivate a user account (set status to 'disabled').
   * Prevents login while preserving historical data.
   */
  async deactivateUser(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'User not found',
      });
    }

    if (user.status === UserStatus.DISABLED) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'User is already deactivated',
      });
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DISABLED },
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

  /**
   * Delete a user (admin only). Cannot delete yourself.
   */
  async deleteUser(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: '用户不存在' });
    }

    // 检查是否有关联的任务
    const taskCount = await this.prisma.task.count({ where: { ownerId: id } });
    if (taskCount > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: '该用户有关联的任务，不能删除。请先将任务重新分配或禁用该用户。',
      });
    }

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Update own profile (name, username).
   */
  async updateMyProfile(userId: bigint, dto: { name?: string; username?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: '用户不存在' });
    }

    // 如果修改用户名，检查唯一性
    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (existing) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
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

  /**
   * Change own password.
   */
  async changePassword(userId: bigint, dto: { old_password: string; new_password: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: '用户不存在' });
    }

    // 验证旧密码
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(dto.old_password, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: '当前密码不正确',
      });
    }

    // 哈希新密码
    const newHash = await this.authService.hashPassword(dto.new_password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: '密码修改成功' };
  }
}
