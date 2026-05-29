import { TaskStatus } from '../../../domain/enums/task-status.enum';
export declare class UpdateTaskStatusDto {
    status: TaskStatus;
    progress?: number;
    note?: string;
    blocked_reason?: string;
}
