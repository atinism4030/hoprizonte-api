import { EStoryContentTypes } from "src/types/story.types";
import { IsEnum, IsMongoId, IsOptional, IsString } from "class-validator";

export class CreateStoryDto {
  @IsEnum(EStoryContentTypes)
  content_type: EStoryContentTypes;

  content: string;

  @IsOptional()
  @IsMongoId()
  company?: string;

  @IsOptional()
  @IsString()
  duration?: string;
}
