import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infra/prisma';
import { ErrorCodes } from '../../domain/constants';
import { UserStatus } from '../../domain/enums';
import { JwtPayload } from './interfaces';

const BCRYPT_COST_FACTOR = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials.
   * Returns the user if valid, throws UnauthorizedException otherwise.
   * Does not reveal which field (username or password) is incorrect.
   */
  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
        data: null,
      });
    }

    // Disabled users cannot login
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
        data: null,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
        data: null,
      });
    }

    return user;
  }

  /**
   * Generate a JWT token for the given user.
   * Payload includes userId (as string for JSON serialization) and role.
   */
  generateToken(user: { id: bigint; role: string }): string {
    const payload = {
      userId: user.id.toString(),
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Hash a password using bcrypt with cost factor ≥ 10.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST_FACTOR);
  }

  /**
   * Get user profile by ID (for /me endpoint).
   */
  async getUserProfile(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        orgId: true,
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

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'User not found',
        data: null,
      });
    }

    return user;
  }
}
