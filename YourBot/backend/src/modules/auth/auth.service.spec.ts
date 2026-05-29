import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infra/prisma';
import { ErrorCodes } from '../../domain/constants';
import { UserStatus } from '../../domain/enums';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: BigInt(1),
    orgId: BigInt(1),
    username: 'testuser',
    passwordHash: '', // will be set in beforeAll
    name: 'Test User',
    role: 'manager',
    email: 'test@example.com',
    phone: '1234567890',
    avatar: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    // Hash a known password for testing
    mockUser.passwordHash = await bcrypt.hash('password123', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser('testuser', 'password123');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.validateUser('testuser', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is disabled', async () => {
      const disabledUser = { ...mockUser, status: UserStatus.DISABLED };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(disabledUser);

      await expect(
        service.validateUser('testuser', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not reveal which field is incorrect in error response', async () => {
      // Test with non-existent user
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      try {
        await service.validateUser('nonexistent', 'password123');
      } catch (e) {
        expect(e.response.code).toBe(ErrorCodes.UNAUTHORIZED);
        expect(e.response.message).toBe('Invalid credentials');
      }

      // Test with wrong password - same error message
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      try {
        await service.validateUser('testuser', 'wrongpassword');
      } catch (e) {
        expect(e.response.code).toBe(ErrorCodes.UNAUTHORIZED);
        expect(e.response.message).toBe('Invalid credentials');
      }
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with userId and role', () => {
      const user = { id: BigInt(1), role: 'manager' };
      const token = service.generateToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: '1',
        role: 'manager',
      });
      expect(token).toBe('mock-jwt-token');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt cost factor >= 10', async () => {
      const password = 'testpassword';
      const hash = await service.hashPassword(password);

      // Verify it's a valid bcrypt hash
      expect(hash).toMatch(/^\$2[aby]\$/);

      // Verify the cost factor is at least 10
      const rounds = parseInt(hash.split('$')[2], 10);
      expect(rounds).toBeGreaterThanOrEqual(10);

      // Verify the hash can be compared back
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without passwordHash', async () => {
      const profileData = {
        id: BigInt(1),
        orgId: BigInt(1),
        username: 'testuser',
        name: 'Test User',
        role: 'manager',
        email: 'test@example.com',
        phone: '1234567890',
        avatar: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(profileData);

      const result = await service.getUserProfile({
        userId: BigInt(1),
        role: 'manager',
      });

      expect(result).toEqual(profileData);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getUserProfile({ userId: BigInt(999), role: 'manager' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
