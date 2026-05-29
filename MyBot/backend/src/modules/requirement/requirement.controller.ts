import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { RequirementService } from './requirement.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/interfaces';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementQueryDto } from './dto/requirement-query.dto';
import { ConfirmSplitDto } from './dto/confirm-split.dto';

/**
 * Requirement CRUD controller.
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.4
 */
@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementController {
  constructor(private readonly requirementService: RequirementService) {}

  /**
   * POST /api/v1/requirements - Create a new requirement.
   * Only manager and admin can create requirements.
   */
  @Post()
  @Roles('manager', 'admin')
  async create(
    @Body() dto: CreateRequirementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.requirementService.create(dto, user.userId);
  }

  /**
   * GET /api/v1/requirements - Get paginated list with filters and sorting.
   */
  @Get()
  async findAll(@Query() query: RequirementQueryDto) {
    return this.requirementService.findAll(query);
  }

  /**
   * GET /api/v1/requirements/:id - Get requirement detail.
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requirementService.findOne(BigInt(id));
  }

  /**
   * PUT /api/v1/requirements/:id - Update a requirement.
   * Only manager and admin can update requirements.
   */
  @Put(':id')
  @Roles('manager', 'admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirementService.update(BigInt(id), dto);
  }

  /**
   * POST /api/v1/requirements/:id/split - Submit AI split job.
   * Creates an ai_jobs record, transitions requirement to 'analyzing', returns job_id.
   * Only manager and admin can trigger split.
   * Validates: Requirements 3.1, 3.2, 3.4
   */
  @Post(':id/split')
  @Roles('manager', 'admin')
  @HttpCode(200)
  async split(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.requirementService.splitRequirement(BigInt(id), user.userId);
  }

  /**
   * POST /api/v1/requirements/:id/confirm-split - Confirm and persist the task tree.
   * Persists all tasks with parent-child relationships atomically,
   * transitions requirement status: split_done → assigned,
   * and emits task.created events for each task via outbox.
   * Only manager and admin can confirm.
   * Validates: Requirements 3.3, 3.4
   */
  @Post(':id/confirm-split')
  @Roles('manager', 'admin')
  @HttpCode(200)
  async confirmSplit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmSplitDto,
  ) {
    return this.requirementService.confirmSplit(BigInt(id), dto);
  }

  /**
   * DELETE /api/v1/requirements/:id - Delete a requirement.
   * Only manager and admin can delete. Only draft requirements can be deleted.
   */
  @Delete(':id')
  @Roles('manager', 'admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.requirementService.remove(BigInt(id));
  }
}
