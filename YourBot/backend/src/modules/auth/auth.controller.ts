import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import type { JwtPayload } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    const token = this.authService.generateToken(user);

    return {
      token,
      user: {
        id: user.id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getUserProfile(user);

    return {
      id: profile.id.toString(),
      orgId: profile.orgId?.toString() ?? null,
      username: profile.username,
      name: profile.name,
      role: profile.role,
      email: profile.email,
      phone: profile.phone,
      avatar: profile.avatar,
      status: profile.status,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
