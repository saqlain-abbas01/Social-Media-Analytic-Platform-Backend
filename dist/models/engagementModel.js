"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EngagementSchema = new mongoose_1.Schema({
    postId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Post",
        required: true,
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    timestamp: { type: Date, required: true },
    platform: { type: String },
    metrics: {
        likes: Number,
        comments: Number,
        shares: Number,
        clicks: Number,
        impressions: Number,
    },
    hourOfDay: { type: Number, min: 0, max: 23, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6, index: true },
    createdAt: { type: Date, default: Date.now },
});
// ✅ Compound Indexes
EngagementSchema.index({ postId: 1, timestamp: -1 });
EngagementSchema.index({ userId: 1, timestamp: -1 });
EngagementSchema.index({ userId: 1, dayOfWeek: 1, hourOfDay: 1 });
// ✅ TTL Index: auto-delete after 90 days (90 * 24 * 60 * 60 = 7776000 seconds)
EngagementSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
exports.default = (0, mongoose_1.model)("Engagement", EngagementSchema);
//# sourceMappingURL=engagementModel.js.map