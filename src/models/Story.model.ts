import mongoose from "mongoose";
import { EStoryContentTypes } from "src/types/story.types";

export const StorySchema = new mongoose.Schema(
  {
    content: { type: String, required: true },

    content_type: {
      type: String,
      enum: Object.values(EStoryContentTypes),
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    views: [
      {
        viewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Account",
          required: false,
        },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    total_views_count: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
