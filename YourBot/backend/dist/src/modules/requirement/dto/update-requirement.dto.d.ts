import { RequirementStatus } from '../../../domain/enums';
export declare class UpdateRequirementDto {
    title?: string;
    background?: string;
    objective?: string;
    constraints?: string;
    deliverables?: any[];
    priority?: number;
    due_date?: string;
    status?: RequirementStatus;
    project_id?: number;
}
