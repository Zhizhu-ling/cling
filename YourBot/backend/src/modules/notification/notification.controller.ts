import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/interfaces';
import { NotificationQueryDto } from './dto';

/**
 * Notification controller handling notification-related endpoints.
 * Validates: Requirements 5.2
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/v1/notifications
   * Paginated notification list for the current user.
   */
  @Get()
  async findAll(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.findAll(user.userId, query);
  }

  /**
   * POST /api/v1/notifications/:id/read
   * Mark a single notification as read.
   */
  @Post(':id/read')
  @HttpCode(200)
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.markAsRead(BigInt(id), user.userId);
  }

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read for the current user.
   */
  @Post('read-all')
  @HttpCode(200)
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationService.markAllAsRead(user.userId);
  }
}
