import { PrismaService } from '../../infra/prisma';
export interface BoardTaskItem {
    id: string;
    title: string;
    owner_name: string | null;
    priority: number | null;
    due_date: string | null;
    status: string;
    blocked_reason: string | null;
}
export interface BoardData {
    todo: BoardTaskItem[];
    doing: BoardTaskItem[];
    blocked: BoardTaskItem[];
    done: BoardTaskItem[];
    delayed: BoardTaskItem[];
}
export interface OverviewCards {
    total_requirements: number;
    active_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
}
export interface TaskStatusDistribution {
    todo: number;
    doing: number;
    blocked: number;
    done: number;
    delayed: number;
}
export interface MemberWorkloadItem {
    member_name: string;
    current_workload: number;
    available_hours: number;
}
export interface ActiveAlertItem {
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
}
export interface DashboardOverviewData {
    overview_cards: OverviewCards;
    task_status_distribution: TaskStatusDistribution;
    member_workload: MemberWorkloadItem[];
    active_alerts: ActiveAlertItem[];
}
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<DashboardOverviewData>;
    private getOverviewCards;
    private getTaskStatusDistribution;
    private getMemberWorkload;
    private getActiveAlerts;
    getBoard(filters: {
        requirementId?: bigint;
        ownerId?: bigint;
    }): Promise<BoardData>;
}
