import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../infra/prisma';
import { AuthService } from '../auth/auth.service';
import { UserRole, UserStatus } from '../../domain/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let authService: any;

  const mockUser = {
    id: BigInt(1),
    username: 'testuser',
    passwordHash: '$2b$10$hashedpassword',
    name: 'Test User',
    role: UserRole.MEMBER,
    email: 'test@example.com',
    phone: '1234567890',
    avatar: null,
    status: UserStatus.ACTIVE,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    authService = {
      hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('createUser', () => {
    const createDto: CreateUserDto = {
      username: 'newuser',
      password: 'password123',
      name: 'New User',
      role: UserRole.MEMBER,
      email: 'new@example.com',
    };

    it('should create a user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: BigInt(2),
        username: 'newuser',
        name: 'New User',
        role: UserRole.MEMBER,
        email: 'new@example.com',
        phone: null,
        avatar: null,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const result = await service.createUser(createDto);

      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'newuser',
          passwordHash: '$2b$10$hashedpassword',
          name: 'New User',
          role: UserRole.MEMBER,
          email: 'new@example.com',
          phone: null,
          avatar: null,
          status: UserStatus.ACTIVE,
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe('2');
      expect(result.username).toBe('newuser');
      expect(result.role).toBe(UserRole.MEMBER);
    });

    it('should reject duplicate username', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.username === 'newuser') return mockUser;
        return null;
      });

      await expect(service.createUser(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate email', async () => {
      prisma.user.findUnique.mockImplementation(({ where }) => {
        if (where.username) return null;
        if (where.email === 'new@example.com') return mockUser;
        return null;
      });

      await expect(service.createUser(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated user list', async () => {
      const users = [
        {
          id: BigInt(1),
          username: 'user1',
          name: 'User 1',
          role: UserRole.MEMBER,
          email: 'user1@example.com',
          phone: null,
          avatar: null,
          status: UserStatus.ACTIVE,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, page_size: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe('1');
      expect(result.pagination).toEqual({ page: 1, page_size: 20, total: 1 });
    });

    it('should filter by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll({ role: UserRole.ADMIN });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.ADMIN },
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll({ status: UserStatus.ACTIVE });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: UserStatus.ACTIVE },
        }),
      );
    });

    it('should use default pagination when not provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.page_size).toBe(20);
    });
  });

  describe('updateUser', () => {
    const updateDto: UpdateUserDto = {
      role: UserRole.MANAGER,
    };

    it('should update user role', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        role: UserRole.MANAGER,
      });

      const result = await service.updateUser(BigInt(1), updateDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { role: UserRole.MANAGER },
        select: expect.any(Object),
      });
      expect(result.role).toBe(UserRole.MANAGER);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser(BigInt(999), updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update user status', async () => {
      const statusDto: UpdateUserDto = { status: UserStatus.DISABLED };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.DISABLED,
      });

      const result = await service.updateUser(BigInt(1), statusDto);

      expect(result.status).toBe(UserStatus.DISABLED);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate an active user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.DISABLED,
      });

      const result = await service.deactivateUser(BigInt(1));

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { status: UserStatus.DISABLED },
        select: expect.any(Object),
      });
      expect(result.status).toBe(UserStatus.DISABLED);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivateUser(BigInt(999))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for already deactivated user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.DISABLED,
      });

      await expect(service.deactivateUser(BigInt(1))).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
