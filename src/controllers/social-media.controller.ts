import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/services/cloudinary.service';
import { ContentScheduleService } from 'src/services/content-schedule.service';

@Controller('social-media')
export class SocialMediaController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly contentScheduleService: ContentScheduleService,
  ) { }

  @Get('folders')
  async getFolders(@Query('parent') parent: string = 'ads') {
    return await this.cloudinaryService.getCompanyFolders(parent);
  }

  @Get('images')
  async getImages(@Query('folder') folder: string) {
    return await this.cloudinaryService.getCompanyImages(folder);
  }

  @Get('content-schedules')
  async getAllSchedules() {
    return await this.contentScheduleService.getAllSchedules();
  }

  @Get('content-schedules/:companyId')
  async getScheduleByCompany(@Param('companyId') companyId: string) {
    return await this.contentScheduleService.getScheduleByCompany(companyId);
  }

  @Patch('content-schedules/:companyId/week')
  async upsertWeekEntry(
    @Param('companyId') companyId: string,
    @Body()
    body: {
      company_name: string;
      week_start: string;
      image_url?: string | null;
      image_public_id?: string | null;
      image_selected?: boolean;
      image_edited?: boolean;
      posted?: boolean;
    },
  ) {
    const { company_name, week_start, ...patch } = body;
    return await this.contentScheduleService.upsertWeekEntry(
      companyId,
      company_name,
      week_start,
      patch,
    );
  }

  @Post('content-schedules/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadContentImage(
    @UploadedFile() file: any,
    @Body('companyId') companyId: string,
    @Body('companyName') companyName: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!companyName) throw new BadRequestException('Company name is required');

    const sanitized = companyName.replace(/[&#%<>?]/g, '').trim();
    const folder = `ads/${sanitized}-${companyId}`;
    const result = await this.cloudinaryService.uploadFile(file, folder);
    return {
      image_url: result.secure_url,
      image_public_id: result.public_id,
    };
  }
}