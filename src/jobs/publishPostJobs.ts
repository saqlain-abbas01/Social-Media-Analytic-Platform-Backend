import cron from "node-cron";
import { Post } from "../models/postModel";

export const startPublishPostsJob = () => {
  // Runs every minute
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Checking for scheduled posts to publish...");

    try {
      const now = new Date();

      // Find due scheduled posts
      const posts = await Post.find({
        status: "draft",
        scheduledAt: { $lte: now },
      }).lean();
      console.log("posts", posts);
      if (posts.length === 0) return;

      console.log(`🚀 Found ${posts.length} post(s) to publish.`);

      for (const post of posts) {
        try {
          // TODO: integrate with social API or mock publish
          console.log(`📢 Publishing post: ${post._id} to ${post.platform}`);

          await Post.updateOne(
            { _id: post._id },
            { $set: { status: "published", publishedAt: new Date() } }
          );

          console.log(`✅ Post ${post._id} published successfully.`);
        } catch (err) {
          console.error(`❌ Failed to publish post ${post._id}:`, err);
          await Post.updateOne(
            { _id: post._id },
            { $set: { status: "failed" } }
          );
        }
      }
    } catch (err) {
      console.error("Error checking for scheduled posts:", err);
    }
  });
};
