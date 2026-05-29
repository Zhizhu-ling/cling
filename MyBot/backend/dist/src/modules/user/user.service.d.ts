import { PrismaService } from '../../infra/prisma';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { PaginatedList } from '../../common/interfaces/api-response.interface';
export declare class UserService {
    private readonly prisma;
    private readonly authService;
    constructor(prisma: PrismaService, authService: AuthService);
    createUser(dto: CreateUserDto): Promise<{
        id: string;
        createdAt: string;
        updatedAt: string;
        username: string;
        email: string;
        name: string;
        role: string;
        phone: string | null;
        avatar: string | null;
        status: string;
    }>;
    findAll(query: QueryUsersDto): Promise<PaginatedList<any>>;
    updateUser(id: bigint, dto: UpdateUserDto): Promise<{
        id: string;
        createdAt: string;
        updatedAt: string;
        username: string;
        email: string;
        name: string;
        role: string;
        phone: string | null;
        avatar: string | null;
        status: string;
    }>;
    deactivateUser(id: bigint): Promise<{
        id: string;
        createdAt: string;
        updatedAt: string;
        username: string;
        email: string;
        name: string;
        role: string;
        phone: string | null;
        avatar: string | null;
        status: string;
    }>;
    deleteUser(id: bigint): Promise<{
        deleted: boolean;
    }>;
    updateMyProfile(userId: bigint, dto: {
        name?: string;
        username?: string;
    }): Promise<{
        id: string;
        username: string;
        email: string;
        name: string;
        role: string;
        status: string;
    }>;
    changePassword(userId: bigint, dto: {
        old_password: string;
        new_password: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
