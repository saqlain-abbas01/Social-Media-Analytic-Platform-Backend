import mongoose, { Document } from "mongoose";
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
export declare const Post: mongoose.Model<IPost, {}, {}, {}, mongoose.Document<unknown, {}, IPost, {}, {}> & IPost & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=postModel.d.ts.map