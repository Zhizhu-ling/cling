import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { BoardQueryDto } from './dto';

/**
 * Dashboard controller handling board and overview endpoints.
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/v1/dashboard
   * Returns dashboard overview data including:
   * - Overview cards (total requirements, active tasks, completed tasks, overdue tasks)
   * - Task status distribution for chart
   * - Member workload distribution
   * - Active alerts list
   *
   * Only manager and admin can access.
   *
   * Validates: Requirements 9.1, 9.2, 9.3
   */
  @Get()
  @Roles('manager', 'admin')
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  /**
   * GET /api/v1/dashboard/board
   * Returns tasks grouped by status columns (todo, doing, blocked, done, delayed).
   * Supports filters: requirement_id, owner_id.
   * Only manager and admin can access.
   *
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  @Get('board')
  @Roles('manager', 'admin')
  async getBoard(@Query() query: BoardQueryDto) {
    return this.dashboardService.getBoard({
      requirementId: query.requirement_id
        ? BigInt(query.requirement_id)
        : undefined,
      ownerId: query.owner_id ? BigInt(query.owner_id) : undefined,
    });
  }
}
