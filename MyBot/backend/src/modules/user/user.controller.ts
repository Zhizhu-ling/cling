import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateMyProfileDto, ChangePasswordDto } from './dto/profile.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/interfaces';
import { UserRole } from '../../domain/enums';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * PUT /api/v1/users/me/profile - Update own profile (any authenticated user)
   * Must be before :id routes to avoid "me" being treated as an id
   */
  @Put('me/profile')
  async updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.userService.updateMyProfile(user.userId, dto);
  }

  /**
   * PUT /api/v1/users/me/password - Change own password (any authenticated user)
   */
  @Put('me/password')
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.userId, dto);
  }

  /**
   * POST /api/v1/users - Create a new user (admin only)
   */
  @Post()
  @Roles(UserRole.ADMIN)
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  /**
   * GET /api/v1/users - Paginated user list (admin and manager)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(@Query() query: QueryUsersDto) {
    return this.userService.findAll(query);
  }

  /**
   * PUT /api/v1/users/:id/deactivate - Deactivate user (admin only)
   */
  @Put(':id/deactivate')
  @Roles(UserRole.ADMIN)
  async deactivateUser(@Param('id') id: string) {
    return this.userService.deactivateUser(BigInt(id));
  }

  /**
   * PUT /api/v1/users/:id - Update user role/status (admin only)
   */
  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(BigInt(id), dto);
  }

  /**
   * DELETE /api/v1/users/:id - Delete user (admin only)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(BigInt(id));
  }
}
