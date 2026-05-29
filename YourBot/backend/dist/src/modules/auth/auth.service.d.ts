import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infra/prisma';
import { JwtPayload } from './interfaces';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    validateUser(username: string, password: string): Promise<{
        id: bigint;
        username: string;
        email: string;
        orgId: bigint | null;
        passwordHash: string;
        name: string;
        role: string;
        phone: string | null;
        avatar: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    generateToken(user: {
        id: bigint;
        role: string;
    }): string;
    hashPassword(password: string): Promise<string>;
    getUserProfile(payload: JwtPayload): Promise<{
        id: bigint;
        username: string;
        email: string;
        orgId: bigint | null;
        name: string;
        role: string;
        phone: string | null;
        avatar: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
