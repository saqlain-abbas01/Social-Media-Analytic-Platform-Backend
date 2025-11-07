// controllers/postController.ts
import { Request, Response } from "express";
import { IPost, Post } from "../models/postModel";
import mongoose from "mongoose";
import AnalyticsCache from "../models/analyticsCache";
import Engagement from "../models/engagementModel";
import { log } from "console";

export const createPost = async (req: Request, res: Response) => {
  const { content, platform, scheduledAt, status } = req.body as IPost;
  const userId = req.user?.userId;

  console.log("status", status);
  // --- Validation ---
  if (!content || content.length > 1000) {
    return res.status(400).json({
      message: "Content is required and must be under 1000 characters",
    });
  }

  const allowedPlatforms = ["twitter", "facebook", "instagram", "linkedin"];
  if (!allowedPlatforms.includes(platform)) {
    return res.status(400).json({ message: "Invalid platform" });
  }

  const allowedStatuses = ["draft", "scheduled", "published", "failed"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // --- Hashtag extraction ---
  const hashtags = (content.match(/#\w+/g) || []).map((tag) =>
    tag.toLowerCase()
  );
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // --- Prepare post data ---
  const newPost = new Post({
    userId,
    content,
    platform,
    scheduledAt,
    status,
    metadata: { hashtags, wordCount },
    publishedAt: status === "published" ? new Date() : undefined,
  });

  // --- Save ---
  const savedPost = await newPost.save();

  res.status(201).json({
    message: "Post created successfully",
    data: savedPost,
  });
};

export const updatePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body as IPost;
  const role = req.user?.role;
  if (role === "user") {
  }
  // ✅ Validate ID
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  // ✅ Find post
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  // ❌ Prevent editing published posts
  if (post.status === "published") {
    return res
      .status(400)
      .json({ message: "Published posts cannot be edited" });
  }

  if (
    role === "user" &&
    post.userId.toString() !== (req.user?.userId as string)
  ) {
    return res
      .status(403)
      .json({ message: "You can only update your own posts" });
  }

  // ✅ Apply updates
  if (updateData.content) {
    post.content = updateData.content;
    post.metadata = {
      hashtags: updateData.content.match(/#[a-zA-Z0-9_]+/g) || [],
      wordCount: updateData.content.split(/\s+/).length,
    };
  }
  console.log("update data", updateData);
  if (updateData.platform) post.platform = updateData.platform;
  if (updateData.scheduledAt) post.scheduledAt = updateData.scheduledAt;
  if (updateData.status) post.status = updateData.status;

  const savedPost = await post.save();
  console.log("saved post", savedPost);
  res.json({ message: "Post updated successfully", data: savedPost });
};

export const getPosts = async (req: Request, res: Response) => {
  const {
    page = "1",
    limit = "20",
    status,
    platform,
    sort = "-createdAt",
    search,
    startDate,
    endDate,
  } = req.query;
  console.log("query", req.query);
  const userId = req.user?.userId;
  console.log("startDate", startDate, "endDate", endDate);
  const pageNum = Math.max(parseInt(page as string), 1);
  const limitNum = Math.min(Math.max(parseInt(limit as string), 1), 100);

  // ✅ Build filter dynamically
  const filter: any = { userId };

  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  if (startDate && endDate)
    filter.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };

  if (search) {
    filter.content = { $regex: search, $options: "i" }; // text search
  }

  // ✅ Sort (handle - prefix for descending)
  const sortOption: any = {};
  const sortField = (sort as string).replace("-", "");
  sortOption[sortField] = (sort as string).startsWith("-") ? -1 : 1;

  console.log("filters", filter);

  // ✅ Fetch posts (lean for performance + projection for light payload)
  const posts = await Post.find(filter)
    .sort(sortOption)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  // ✅ Count total for pagination
  const total = await Post.countDocuments(filter);

  res.json({
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
    data: posts,
  });
};

export const getPostById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user; // from auth middleware
  console.log("id", id);
  // ✅ Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  // ✅ Base query
  const filter: any = { _id: id };

  // If user is not admin, restrict to their own posts
  if (user?.role === "user") {
    filter.userId = user?.userId;
  }

  // ✅ Optimized query: lean() + field projection
  const post = await Post.findOne(filter)
    .select("content platform status scheduledAt publishedAt createdAt")
    .lean();

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json({ message: "Post retrived successfully", data: post });
};

export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user; // from auth middleware

  // ✅ Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: "Invalid post ID" });
  }

  // ✅ Base query
  const filter: any = { _id: id };

  // If user is not admin, restrict to their own posts
  if (user?.role === "user") {
    filter.userId = user.userId;
  }

  // ✅ Find the post first
  const post = await Post.findOne(filter).lean();

  if (!post) {
    return res.status(404).json({ message: "Post not found or unauthorized" });
  }

  // ❌ Prevent deleting published posts
  if (post.status === "published") {
    return res.status(400).json({ message: "Cannot delete published post" });
  }

  // ✅ Delete post
  const deletedPost = await Post.deleteOne({ _id: id });

  res.json({ message: "Post deleted successfully", data: deletedPost });
};

export const getPostAnalytics = async (req: Request, res: Response) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user?.userId;
    console.log("id", postId);

    if (!mongoose.Types.ObjectId.isValid(postId as string)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const cacheKey = `post:${postId}:analytics:${userId}`;

    // 1️⃣ Check Cache First
    const cached = await AnalyticsCache.findOne({ cacheKey }).lean();
    if (cached) {
      return res.status(200).json({
        source: "cache",
        data: cached.data,
      });
    }

    // 2️⃣ Fetch Post
    const post = await Post.findById(postId).lean();
    if (!post) return res.status(404).json({ message: "Post not found" });

    // 3️⃣ Fetch Engagement Data for this Post
    const engagements = await Engagement.find({ postId }).lean();

    if (engagements.length === 0) {
      return res.status(200).json({
        source: "live",
        data: {
          totalEngagement: 0,
          engagementRate: 0,
          clickThroughRate: 0,
          averageEngagementPerHour: 0,
          performanceScore: 0,
        },
      });
    }

    // Aggregate metrics
    const totals = engagements.reduce(
      (acc, e) => {
        acc.likes += e.metrics?.likes || 0;
        acc.comments += e.metrics?.comments || 0;
        acc.shares += e.metrics?.shares || 0;
        acc.clicks += e.metrics?.clicks || 0;
        acc.impressions += e.metrics?.impressions || 0;
        return acc;
      },
      { likes: 0, comments: 0, shares: 0, clicks: 0, impressions: 0 }
    );

    const totalEngagement = totals.likes + totals.comments + totals.shares;

    const engagementRate =
      totals.impressions > 0 ? (totalEngagement / totals.impressions) * 100 : 0;

    const clickThroughRate =
      totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    const hoursSincePublished = post.publishedAt
      ? (Date.now() - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60)
      : 1;

    const averageEngagementPerHour = totalEngagement / hoursSincePublished;

    const performanceScore =
      engagementRate * 0.4 + clickThroughRate * 0.3 + totals.shares * 0.3;

    const analyticsData = {
      totalEngagement,
      engagementRate,
      clickThroughRate,
      averageEngagementPerHour,
      performanceScore,
    };

    // 4️⃣ Cache analytics in MongoDB for 15 minutes (TTL)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await AnalyticsCache.create({
      cacheKey,
      userId,
      data: analyticsData,
      expiresAt,
    });

    res.status(200).json({
      source: "live",
      data: analyticsData,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Server error" });
  }
};
