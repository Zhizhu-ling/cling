import { UserRole, UserStatus } from '../../../domain/enums';
export declare class QueryUsersDto {
    page?: number;
    page_size?: number;
    role?: UserRole;
    status?: UserStatus;
}
