import { RequirementStatus } from '../../../domain/enums';
export declare class RequirementQueryDto {
    page?: number;
    page_size?: number;
    status?: RequirementStatus;
    priority?: number;
    sort_by?: 'created_at' | 'due_date';
    sort_order?: 'asc' | 'desc';
}
