import { Document, Types } from "mongoose";

export enum EStoryContentTypes {
    IMAGE = "IMAGE",
    VIDEO = "VIDEO"
}

export interface IStory extends Document {
  content: string;
  
  content_type: EStoryContentTypes;

  company?: Types.ObjectId;

  views: Types.ObjectId[];

  total_views_count?: number;

  duration?: string;

  createdAt: Date;
  updatedAt: Date;
}
