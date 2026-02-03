import { Controller, Get, Query } from '@nestjs/common';
import { CloudinaryService } from 'src/services/cloudinary.service';

@Controller('social-media')
export class SocialMediaController {

  constructor(
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Get('folders')
  async getFolders() {
    return await this.cloudinaryService.getCompanyFolders('ads');
  }

  @Get('images')
  async getImages(@Query('folder') folder: string) {
    return await this.cloudinaryService.getCompanyImages(folder);
  }
}