import { IsString, IsOptional, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating own profile (name, username).
 */
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username?: string;
}

/**
 * DTO for changing own password.
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入当前密码' })
  old_password: string;

  @IsString()
  @IsNotEmpty({ message: '请输入新密码' })
  @MinLength(6, { message: '新密码至少6个字符' })
  new_password: string;
}
