import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../../domain/enums';
import { UserStatus } from '../../../domain/enums';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;
}
