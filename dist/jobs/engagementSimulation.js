"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const postModel_1 = require("../models/postModel");
const engagementModel_1 = __importDefault(require("../models/engagementModel"));
// 🧮 Utility Functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getEngagementMultiplier() {
    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    // 🕐 Time of day multiplier
    let timeMultiplier = 1;
    if (hour >= 9 && hour <= 17)
        timeMultiplier = 1.5;
    else if (hour >= 18 && hour <= 22)
        timeMultiplier = 1.2;
    else
        timeMultiplier = 0.7;
    // 📅 Day of week multiplier
    const dayMultiplier = day === 0 || day === 6 ? 0.6 : 1.0;
    return timeMultiplier * dayMultiplier;
}
function getAgeMultiplier(publishedAt) {
    const hoursSincePublished = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSincePublished < 12)
        return 1.5;
    if (hoursSincePublished < 48)
        return 1.2;
    if (hoursSincePublished < 120)
        return 0.8;
    return 0.5;
}
// 🧩 Job logic
async function simulateEngagement() {
    try {
        const publishedPosts = await postModel_1.Post.find({ status: "published" })
            .select("_id userId platform publishedAt")
            .lean();
        if (publishedPosts.length === 0)
            return;
        const now = new Date();
        const engagementsToInsert = publishedPosts.map((post) => {
            const multiplier = getEngagementMultiplier() * getAgeMultiplier(post.publishedAt);
            const likes = Math.round(randomInt(0, 50) * multiplier);
            const comments = Math.round(randomInt(0, 20) * multiplier);
            const shares = Math.round(randomInt(0, 15) * multiplier);
            const clicks = Math.round(randomInt(0, 100) * multiplier);
            const impressions = Math.round(randomInt(100, 1000) * multiplier);
            return {
                postId: post._id,
                userId: post.userId,
                platform: post.platform,
                timestamp: now,
                metrics: { likes, comments, shares, clicks, impressions },
                hourOfDay: now.getHours(),
                dayOfWeek: now.getDay(),
                createdAt: now,
            };
        });
        await engagementModel_1.default.insertMany(engagementsToInsert);
        console.log(`✅ [Cron] Simulated ${engagementsToInsert.length} engagements`);
    }
    catch (err) {
        console.error("❌ [Cron] Engagement simulation error:", err);
    }
}
// 🕒 Schedule job every 30 seconds
node_cron_1.default.schedule("*/30 * * * * *", async () => {
    console.log("starting engagement simulation");
    await simulateEngagement();
});
//# sourceMappingURL=engagementSimulation.js.map