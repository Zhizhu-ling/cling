import { RequirementService } from './requirement.service';
import type { JwtPayload } from '../auth/interfaces';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementQueryDto } from './dto/requirement-query.dto';
import { ConfirmSplitDto } from './dto/confirm-split.dto';
export declare class RequirementController {
    private readonly requirementService;
    constructor(requirementService: RequirementService);
    create(dto: CreateRequirementDto, user: JwtPayload): Promise<{
        id: bigint;
        status: string;
    }>;
    findAll(query: RequirementQueryDto): Promise<import("../../common").PaginatedList<{
        id: bigint;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        background: string;
        objective: string;
        constraints: string | null;
        deliverables: import("@prisma/client/runtime/client").JsonValue;
        priority: number;
        dueDate: Date;
        aiSummary: string | null;
    }>>;
    findOne(id: number): Promise<{
        id: bigint;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        background: string;
        objective: string;
        constraints: string | null;
        deliverables: import("@prisma/client/runtime/client").JsonValue;
        priority: number;
        dueDate: Date;
        aiSummary: string | null;
    }>;
    update(id: number, dto: UpdateRequirementDto): Promise<{
        id: bigint;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: bigint;
        projectId: bigint | null;
        title: string;
        background: string;
        objective: string;
        constraints: string | null;
        deliverables: import("@prisma/client/runtime/client").JsonValue;
        priority: number;
        dueDate: Date;
        aiSummary: string | null;
    }>;
    split(id: number, user: JwtPayload): Promise<{
        job_id: string;
    }>;
    confirmSplit(id: number, dto: ConfirmSplitDto): Promise<{
        task_ids: string[];
    }>;
    remove(id: number): Promise<{
        deleted: boolean;
    }>;
}
