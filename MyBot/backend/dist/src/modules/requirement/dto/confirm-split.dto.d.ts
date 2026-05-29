export declare class ConfirmSplitTaskDto {
    task_key: string;
    title: string;
    description?: string;
    estimated_hours?: number;
    dependencies?: string[];
    acceptance_criteria?: string;
    parent_key?: string;
}
export declare class ConfirmSplitDto {
    tasks: ConfirmSplitTaskDto[];
}
