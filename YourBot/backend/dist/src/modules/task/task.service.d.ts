import { PrismaService } from '../../infra/prisma';
import { TaskStatus } from '../../domain/enums';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { PaginatedList } from '../../common/interfaces';
import { TaskQueryDto } from './dto';
import type { Task } from '@prisma/client';
export declare class TaskService {
    private readonly prisma;
    private readonly aiJobService;
    private readonly outboxService;
    private readonly taskStateMachine;
    constructor(prisma: PrismaService, aiJobService: AiJobService, outboxService: OutboxService);
    findAll(query: TaskQueryDto): Promise<PaginatedList<Task>>;
    findOne(id: bigint): Promise<{
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
    suggestAssignment(taskIds: number[], userId: bigint): Promise<{
        job_id: string;
    }>;
    assignTasks(assignments: Array<{
        task_id: number;
        member_id: number;
    }>): Promise<{
        assigned_count: number;
        task_ids: number[];
    }>;
    updateTaskStatus(taskId: bigint, newStatus: TaskStatus, userId: bigint, userRole: string, options?: {
        progress?: number;
        note?: string;
        blocked_reason?: string;
    }): Promise<{
        task_id: string;
        previous_status: string;
        current_status: string;
        updated_at: string;
    }>;
    getComments(taskId: bigint): Promise<({
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
    addComment(taskId: bigint, content: string, authorId: bigint): Promise<{
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
