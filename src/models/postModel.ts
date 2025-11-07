import mongoose, { Schema, Document } from "mongoose";

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  platform: "twitter" | "facebook" | "instagram" | "linkedin";
  scheduledAt: Date;
  publishedAt?: Date;
  status: "draft" | "scheduled" | "published" | "failed";
  metadata?: {
    hashtags: string[];
    wordCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true, maxlength: 1000, trim: true },
    platform: {
      type: String,
      enum: ["twitter", "facebook", "instagram", "linkedin"],
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, index: true },
    publishedAt: { type: Date, index: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "failed"],
      required: true,
      index: true,
    },
    metadata: {
      hashtags: [{ type: String }],
      wordCount: { type: Number },
    },
  },
  { timestamps: true }
);

//
// 🔍 Critical compound indexes
//
postSchema.index({ userId: 1, status: 1, createdAt: -1 });
postSchema.index({ userId: 1, platform: 1 });
postSchema.index({ status: 1, scheduledAt: 1 });
postSchema.index({ status: 1, publishedAt: -1 });

export const Post = mongoose.model<IPost>("Post", postSchema);
