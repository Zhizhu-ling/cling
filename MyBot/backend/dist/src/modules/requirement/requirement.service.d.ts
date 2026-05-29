import { PrismaService } from '../../infra/prisma';
import { PaginatedList } from '../../common/interfaces';
import { AiJobService } from '../ai/ai-job.service';
import { OutboxService } from '../outbox/outbox.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementQueryDto } from './dto/requirement-query.dto';
import { ConfirmSplitDto } from './dto/confirm-split.dto';
import { Requirement } from '@prisma/client';
export declare class RequirementService {
    private readonly prisma;
    private readonly aiJobService;
    private readonly outboxService;
    constructor(prisma: PrismaService, aiJobService: AiJobService, outboxService: OutboxService);
    create(dto: CreateRequirementDto, userId: bigint): Promise<{
        id: bigint;
        status: string;
    }>;
    findAll(query: RequirementQueryDto): Promise<PaginatedList<Requirement>>;
    findOne(id: bigint): Promise<Requirement>;
    splitRequirement(id: bigint, userId: bigint): Promise<{
        job_id: string;
    }>;
    onSplitJobSuccess(requirementId: bigint): Promise<void>;
    update(id: bigint, dto: UpdateRequirementDto): Promise<Requirement>;
    confirmSplit(requirementId: bigint, dto: ConfirmSplitDto): Promise<{
        task_ids: string[];
    }>;
    private topologicalSortTasks;
    remove(id: bigint): Promise<{
        deleted: boolean;
    }>;
}
