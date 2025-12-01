import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from "class-validator";
import { IIndustry } from 'src/types/industry.types';


export class CreateIndustryDTO {
    @ApiProperty({ example: "Construction" })
    @IsString()
    name: string;
    
    @ApiProperty({ example: "icon_url_here" })
    @IsString()
    icon: string;
    
    @ApiProperty({ example: "Parent industry _id" })
    @IsOptional()
    @IsMongoId()
    parent_industry?: string | IIndustry;
}
