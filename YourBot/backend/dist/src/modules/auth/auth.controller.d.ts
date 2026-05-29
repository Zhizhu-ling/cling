import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import type { JwtPayload } from './interfaces';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            name: string;
            role: string;
            email: string;
            avatar: string | null;
        };
    }>;
    getMe(user: JwtPayload): Promise<{
        id: string;
        orgId: string | null;
        username: string;
        name: string;
        role: string;
        email: string;
        phone: string | null;
        avatar: string | null;
        status: string;
        createdAt: string;
        updatedAt: string;
    }>;
}
