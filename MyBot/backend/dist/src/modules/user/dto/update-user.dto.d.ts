import { UserRole } from '../../../domain/enums';
import { UserStatus } from '../../../domain/enums';
export declare class UpdateUserDto {
    role?: UserRole;
    status?: UserStatus;
    name?: string;
    phone?: string;
    avatar?: string;
}
