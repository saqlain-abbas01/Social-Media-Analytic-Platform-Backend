import mongoose, { Schema, model } from "mongoose";

const AnalyticsCacheSchema = new Schema({
  cacheKey: { type: String, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  data: { type: Schema.Types.Mixed },
  expiresAt: { type: Date, index: { expires: 0 } },
});

export default model("AnalyticsCache", AnalyticsCacheSchema);
