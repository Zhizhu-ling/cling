import { UserRole } from '../../../domain/enums';
export declare class CreateUserDto {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    email: string;
    phone?: string;
    avatar?: string;
}
