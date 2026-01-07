import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { EIndustries } from "src/types/industries.types";

export class CreateAccountDTO {

    @ApiProperty({ example: "Timimetal Construction" })
    @IsString()
    name: string;

    @ApiProperty({ example: "Tetovë, Zona Industriale" })
    @IsString()
    address: string;

    @ApiProperty({ example: "info@timimetal.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123" })
    @IsString()
    password: string;

    @ApiProperty({ example: "+38970123456" })
    @IsString()
    phone: string;

    @ApiProperty({ example: "We build LGS houses and steel structures." })
    @IsString()
    description: string;

    @ApiProperty({
        enum: EIndustries,
        isArray: true,
        example: ["ndertim_lgs", "ndertim_fasada"]
    })
    @IsEnum(EIndustries, { each: true })
    industries: EIndustries[];

    @ApiProperty({
        type: [String],
        example: ["Mon-Fri: 08:00-17:00"]
    })
    @IsArray()
    working_hours: string[];

    @ApiProperty({ example: 25 })
    @IsNumber()
    nr_of_workers: number;

    @ApiProperty({
        type: [String],
        example: [
            "https://source.unsplash.com/random/800x600?construction"
        ]
    })
    @IsArray()
    images: string[];

    @ApiProperty({
        example: "https://source.unsplash.com/random/400x300?steel"
    })
    @IsString()
    thumbnail: string;

    @ApiProperty({
        type: "array",
        items: {
            type: "object",
            properties: {
                name: { type: "string" },
                icon: { type: "string" },
                price: { type: "string" }
            }
        },
        example: [
            {
                name: "LGS House Build",
                icon: "lgs",
                price: "120 EUR per meter katror, nese totali i siperfaqes eshte mbi 1000 m2 atehere cmimi eshte 110 EUR/m2"
            }
        ]
    })
    @IsArray()
    services: any[];

    @ApiProperty({
        example: "COMPANY"
    })
    @IsString()
    type: string;

    @ApiProperty({
        type: [String],
        example: []
    })
    @IsArray()
    fav_list: string[];

    @ApiProperty({ example: 100 })
    @IsNumber()
    credits: number;

    @IsArray()
    social_media_links: any[];

    @IsOptional()
    @IsString()
    push_token: string;
}

export class CreateUserAccountDTO {

    @ApiProperty({ example: "info@timimetal.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123" })
    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    push_token: string;
}


export class LoginDTO {

    @ApiProperty({ example: "info@company.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password123" })
    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    push_token: string;
}
