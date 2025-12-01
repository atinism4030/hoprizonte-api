import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { type ObjectId } from 'mongoose';
import { CreateIndustryDTO } from 'src/DTO/industry.dto';
import { IndustrySchema } from 'src/models/industry.model';
import { IndustryService } from 'src/services/industry.service';

@ApiTags('Industry')
@Controller('industry')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Post('/create')
  @ApiOperation({ summary: 'Create a new industry' })
  @ApiBody({ type: CreateIndustryDTO })
  @ApiResponse({ status: 201, description: 'Industry created successfully' })
    async createIndustry(@Body() body: any) {
    const data = body.data ?? body; 
    console.log({ data });

    const response = await this.industryService.createIndustry(data);

    return {
        message: 'Create Industry',
        data: response,
    };
    }


  @Get('/')
  @ApiOperation({ summary: 'Get all industries' })
  @ApiBody({ type: CreateIndustryDTO })
  @ApiResponse({ status: 201, description: '' })
  async getAll() {
    const response = await this.industryService.getAll();
    return {
      message: 'All industries',
      data: response,
    };
  }

  @Delete('/')
  @ApiOperation({ summary: 'Delete industry' })
  @ApiParam({
    name: '_id',
    description: 'industry ID',
    required: true,
  })
  @ApiResponse({ status: 201, description: '' })
  async delete(@Param("id") id: ObjectId) {
    const response = await this.industryService.delete(id);
    return {
      message: 'All industries',
      data: response,
    };
  }

}
