import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { CreateStoryDto } from "src/DTO/story.dto";
import { EStoryContentTypes, IStory } from "src/types/story.types";
import { CloudinaryService } from "./cloudinary.service";

@Injectable()
export class StoryService {
  constructor(
    @InjectModel("Story") private readonly storyModel: Model<IStory>,
    private cloudinary: CloudinaryService,
  ) {}

  async create(dto: CreateStoryDto) {
    console.log({dto});
    
    const story = await this.storyModel.create({
      ...dto,
      company: new Types.ObjectId(dto.company),
    });
    console.log({story});

    return story;
  }

  async createWithFile(file: Express.Multer.File, companyId: string) {
    const uploadResult = await this.cloudinary.uploadFile(file);

    const contentType = uploadResult.resource_type === 'video' 
        ? EStoryContentTypes.VIDEO 
        : EStoryContentTypes.IMAGE;

    return this.storyModel.create({
      content: uploadResult.secure_url,
      content_type: contentType,
      company: new Types.ObjectId(companyId),
      views: [],
    });
  }

  async findAll() {
    return this.storyModel
      .find()
      .populate("company", "name thumbnail type")
      .sort({ createdAt: -1 });
  }

  async findById(id: string) {
    const story = await this.storyModel
      .findById(id)
      .populate("company", "name thumbnail type");

    if (!story) {
      throw new NotFoundException("Story not found");
    }

    return story;
  }

  async findByCompany(companyId: string) {
    return this.storyModel
      .find({ company: companyId })
      .populate("company", "name thumbnail type")
      .sort({ createdAt: -1 });
  }

  async delete(id: string) {
    return this.storyModel
      .findByIdAndDelete(id)
  }
}
