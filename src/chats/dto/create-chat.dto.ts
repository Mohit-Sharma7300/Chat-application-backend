import { IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatDto {
  @IsNotEmpty()
  readonly room_id: string;

  @IsOptional() 
  readonly content?: string;

  @IsOptional()
  readonly tempId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  readonly media?: MediaDto[];
}

export class MediaDto {
  @IsNotEmpty()
  url: string;

  @IsOptional()
  mime?: string;

  @IsOptional()
  type?: 'image' | 'video' | 'document';

  @IsOptional()
  filename?: string;

  @IsOptional()
  size?: number;
}
