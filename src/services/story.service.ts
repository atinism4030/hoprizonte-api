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
  ) { }

  async create(dto: CreateStoryDto) {
    console.log({ dto });

    const story = await this.storyModel.create({
      ...dto,
      company: new Types.ObjectId(dto.company),
    });
    console.log({ story });

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
    const stories = await this.storyModel
      .find()
      .populate({
        path: "company",
        select: "name thumbnail type is_active",
        match: { is_active: { $ne: false } }
      })
      .sort({ createdAt: -1 });

    return stories.filter(story => story.company);
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

  async trackView(id: string, viewerId?: string) {
    const updateData: any = {
      $push: {
        views: {
          viewer: viewerId ? new Types.ObjectId(viewerId) : null,
          viewedAt: new Date(),
        },
      },
      $inc: { total_views_count: 1 },
    };

    return this.storyModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async getAnalytics(id: string) {
    const story = await this.storyModel
      .findById(id)
      .populate("views.viewer", "name type thumbnail");

    if (!story) {
      throw new NotFoundException("Story not found");
    }

    const start = new Date(story.createdAt);
    start.setMinutes(0, 0, 0);
    const now = new Date();

    const hourlyData: { label: string, value: number, timestamp: number }[] = [];
    let current = new Date(start);

    while (current <= now) {
      const label = `${current.getHours().toString().padStart(2, '0')}:00`;
      hourlyData.push({ label, value: 0, timestamp: current.getTime() });
      current = new Date(current.getTime() + 60 * 60 * 1000);
    }

    const formattedViews = story.views.map((view: any) => {
      let viewerName = "Pa llogari";
      let viewerThumbnail = null;
      let viewerType = "ANONYMOUS";

      const viewDate = new Date(view.viewedAt);
      viewDate.setMinutes(0, 0, 0);
      const viewTime = viewDate.getTime();

      const dataPoint = hourlyData.find(d => d.timestamp === viewTime);
      if (dataPoint) {
        dataPoint.value++;
      }

      if (view.viewer) {
        viewerType = view.viewer.type;
        viewerThumbnail = view.viewer.thumbnail;

        if (view.viewer.type === "COMPANY") {
          viewerName = "Biznes";
        } else {
          viewerName = view.viewer.name || "User";
        }
      }

      return {
        name: viewerName,
        type: viewerType,
        thumbnail: viewerThumbnail,
        viewedAt: view.viewedAt,
      };
    });

    return {
      total_views: story.total_views_count || 0,
      unique_viewers: new Set(story?.views?.filter(v => v.viewer)?.map(v => v?.viewer?.toString()))?.size,
      views: formattedViews.reverse(),
      hourly_distribution: {
        labels: hourlyData.map(d => d.label),
        values: hourlyData.map(d => d.value),
      },
    };
  }
}
