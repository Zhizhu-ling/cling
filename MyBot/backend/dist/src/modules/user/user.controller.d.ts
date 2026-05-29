import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateMyProfileDto, ChangePasswordDto } from './dto/profile.dto';
import type { JwtPayload } from '../auth/interfaces';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    updateMyProfile(user: JwtPayload, dto: UpdateMyProfileDto): Promise<{
        id: string;
        username: string;
        email: string;
        name: string;
        role: string;
        status: string;
    }>;
    changePassword(user: JwtPayload, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
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
    findAll(query: QueryUsersDto): Promise<import("../../common").PaginatedList<any>>;
    deactivateUser(id: string): Promise<{
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
    updateUser(id: string, dto: UpdateUserDto): Promise<{
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
    deleteUser(id: string): Promise<{
        deleted: boolean;
    }>;
}
