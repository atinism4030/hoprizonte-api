import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'stories'): Promise<any> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }
}