"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPublishPostsJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const postModel_1 = require("../models/postModel");
const startPublishPostsJob = () => {
    // Runs every minute
    node_cron_1.default.schedule("* * * * *", async () => {
        console.log("⏰ Checking for scheduled posts to publish...");
        try {
            const now = new Date();
            // Find due scheduled posts
            const posts = await postModel_1.Post.find({
                status: "draft",
                scheduledAt: { $lte: now },
            }).lean();
            console.log("posts", posts);
            if (posts.length === 0)
                return;
            console.log(`🚀 Found ${posts.length} post(s) to publish.`);
            for (const post of posts) {
                try {
                    // TODO: integrate with social API or mock publish
                    console.log(`📢 Publishing post: ${post._id} to ${post.platform}`);
                    await postModel_1.Post.updateOne({ _id: post._id }, { $set: { status: "published", publishedAt: new Date() } });
                    console.log(`✅ Post ${post._id} published successfully.`);
                }
                catch (err) {
                    console.error(`❌ Failed to publish post ${post._id}:`, err);
                    await postModel_1.Post.updateOne({ _id: post._id }, { $set: { status: "failed" } });
                }
            }
        }
        catch (err) {
            console.error("Error checking for scheduled posts:", err);
        }
    });
};
exports.startPublishPostsJob = startPublishPostsJob;
//# sourceMappingURL=publishPostJobs.js.map