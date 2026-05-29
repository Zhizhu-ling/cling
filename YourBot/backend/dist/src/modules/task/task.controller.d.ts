import { TaskService } from './task.service';
import type { JwtPayload } from '../auth/interfaces';
import { AssignmentSuggestDto, AssignTaskDto, TaskQueryDto, UpdateTaskStatusDto } from './dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
export declare class TaskController {
    private readonly taskService;
    constructor(taskService: TaskService);
    findAll(query: TaskQueryDto): Promise<import("../../common").PaginatedList<{
        id: bigint;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: bigint | null;
        completedAt: Date | null;
        title: string;
        priority: number | null;
        dueDate: Date | null;
        requirementId: bigint;
        parentTaskId: bigint | null;
        description: string | null;
        collaboratorIds: import("@prisma/client/runtime/client").JsonValue | null;
        estimatedHours: import("@prisma/client-runtime-utils").Decimal | null;
        actualHours: import("@prisma/client-runtime-utils").Decimal | null;
        progressPercent: import("@prisma/client-runtime-utils").Decimal | null;
        startDate: Date | null;
        riskLevel: string | null;
        aiReason: string | null;
        acceptanceCriteria: string | null;
    }>>;
    findOne(id: number): Promise<{
        statusLogs: {
            id: bigint;
            status: string;
            createdAt: Date;
            createdBy: bigint;
            progressPercent: import("@prisma/client-runtime-utils").Decimal | null;
            blockedReason: string | null;
            taskId: bigint;
            note: string | null;
            sourceType: string | null;
        }[];
    } & {
        id: bigint;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        ownerId: bigint | null;
        completedAt: Date | null;
        title: string;
        priority: number | null;
        dueDate: Date | null;
        requirementId: bigint;
        parentTaskId: bigint | null;
        description: string | null;
        collaboratorIds: import("@prisma/client/runtime/client").JsonValue | null;
        estimatedHours: import("@prisma/client-runtime-utils").Decimal | null;
        actualHours: import("@prisma/client-runtime-utils").Decimal | null;
        progressPercent: import("@prisma/client-runtime-utils").Decimal | null;
        startDate: Date | null;
        riskLevel: string | null;
        aiReason: string | null;
        acceptanceCriteria: string | null;
    }>;
    suggestAssignment(dto: AssignmentSuggestDto, user: JwtPayload): Promise<{
        job_id: string;
    }>;
    assignTasks(dto: AssignTaskDto): Promise<{
        assigned_count: number;
        task_ids: number[];
    }>;
    updateTaskStatus(id: number, dto: UpdateTaskStatusDto, user: JwtPayload): Promise<{
        task_id: string;
        previous_status: string;
        current_status: string;
        updated_at: string;
    }>;
    getComments(id: number): Promise<({
        author: {
            id: bigint;
            name: string;
            avatar: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        taskId: bigint;
        content: string;
        authorId: bigint;
    })[]>;
    addComment(id: number, dto: CreateTaskCommentDto, user: JwtPayload): Promise<{
        author: {
            id: bigint;
            name: string;
            avatar: string | null;
        };
    } & {
        id: bigint;
        createdAt: Date;
        taskId: bigint;
        content: string;
        authorId: bigint;
    }>;
}
