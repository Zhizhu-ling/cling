import { TaskStatus } from '../../../domain/enums';
export declare class TaskQueryDto {
    page?: number;
    page_size?: number;
    requirement_id?: number;
    owner_id?: number;
    status?: TaskStatus;
}
