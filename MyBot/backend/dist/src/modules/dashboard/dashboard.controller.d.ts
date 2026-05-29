import { DashboardService } from './dashboard.service';
import { BoardQueryDto } from './dto';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getOverview(): Promise<import("./dashboard.service").DashboardOverviewData>;
    getBoard(query: BoardQueryDto): Promise<import("./dashboard.service").BoardData>;
}
