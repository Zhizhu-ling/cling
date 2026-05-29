import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for creating a task comment.
 */
export class CreateTaskCommentDto {
  @IsString()
  @IsNotEmpty({ message: '评论内容不能为空' })
  @MaxLength(5000, { message: '评论内容不能超过5000字符' })
  content: string;
}
