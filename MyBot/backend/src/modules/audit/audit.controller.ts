import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { PrismaService } from '../../infra/prisma';

/**
 * 审计日志控制器 - 仅管理员可访问。
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/audit-logs
   * 分页获取审计日志列表，支持按 entity_type 和 operation 过滤。
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
    @Query('entity_type') entityType?: string,
    @Query('operation') operation?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize || '20', 10) || 20));

    const where: Record<string, any> = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (operation) {
      where.operation = operation;
    }

    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
        include: {
          operator: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      list,
      pagination: {
        page: pageNum,
        page_size: pageSizeNum,
        total,
      },
    };
  }
}
