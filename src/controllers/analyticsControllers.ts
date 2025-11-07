import { Request, Response } from "express";
import mongoose from "mongoose";
import Engagement from "../models/engagementModel";
import AnalyticsCache from "../models/analyticsCache";
import type { PipelineStage } from "mongoose";
import { PlatformQuery } from "../types";
import { Post } from "../models/postModel";

export const getOptimalPostingTimes = async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user?.userId);
  const cacheKey = `optimal_times_${userId}`;

  // 🧠 1️⃣ Try MongoDB cache first (TTL handled by index)
  const cached = await AnalyticsCache.findOne({ cacheKey });
  if (cached && (cached.expiresAt as Date) > new Date()) {
    console.log("✅ Serving from MongoDB cache");
    return res.json({ cached: true, data: cached.data });
  }

  // 📆 2️⃣ Analyze past 30 days of engagement
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pipeline: PipelineStage[] = [
    { $match: { userId, timestamp: { $gte: thirtyDaysAgo } } },

    // Project only required fields
    {
      $project: {
        likes: 1,
        comments: 1,
        shares: 1,
        clicks: 1,
        impressions: 1,
        timestamp: 1,
        dayOfWeek: { $dayOfWeek: "$timestamp" },
        hourOfDay: { $hour: "$timestamp" },
      },
    },

    // Compute totalEngagement and rate metrics
    {
      $addFields: {
        totalEngagement: { $add: ["$likes", "$comments", "$shares"] },
        engagementRate: {
          $cond: [
            { $gt: ["$impressions", 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ["$likes", "$comments", "$shares"] },
                    "$impressions",
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
        clickThroughRate: {
          $cond: [
            { $gt: ["$impressions", 0] },
            { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
            0,
          ],
        },
      },
    },

    // Group by day + hour
    {
      $group: {
        _id: { dayOfWeek: "$dayOfWeek", hourOfDay: "$hourOfDay" },
        avgEngagement: { $avg: "$totalEngagement" },
        avgEngagementRate: { $avg: "$engagementRate" },
        avgCTR: { $avg: "$clickThroughRate" },
        sampleSize: { $sum: 1 },
      },
    },

    // Compute performance score
    {
      $addFields: {
        performanceScore: {
          $add: [
            { $multiply: ["$avgEngagementRate", 0.4] },
            { $multiply: ["$avgCTR", 0.3] },
            { $multiply: ["$avgEngagement", 0.3] },
          ],
        },
      },
    },

    // Sort and limit top 5
    { $sort: { performanceScore: -1 } },
    { $limit: 5 },
  ];

  const results = await Engagement.aggregate(pipeline, {
    allowDiskUse: true,
  });

  // 💾 3️⃣ Cache the result for 1 hour
  await AnalyticsCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      userId,
      data: results,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
    { upsert: true }
  );

  return res.json({ cached: false, data: results });
};

export const getEngagementTrends = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    period = "30d",
    granularity = "daily",
    metric = "engagement",
  } = req.query as {
    period?: string;
    granularity?: "hourly" | "daily" | "weekly";
    metric?: string;
  };

  const userId = new mongoose.Types.ObjectId(req.user?.userId);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  /** 🧠 Cache key (unique per user + filters) */
  const cacheKey = `engagement_trends_${userId}_${period}_${granularity}_${metric}`;

  /** ⚡ Try to serve from MongoDB cache first */
  const cached = await AnalyticsCache.findOne({ cacheKey });
  if (cached && (cached.expiresAt as Date) > new Date()) {
    console.log("✅ Served from MongoDB cache");
    return res.status(200).json({ cached: true, ...cached.data });
  }

  /** 🕒 Parse time range */
  const days = parseInt(period.replace("d", ""), 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (isNaN(days) ? 30 : days));

  /** 📆 Time granularity logic */
  const dateTrunc: Record<string, Record<string, any>> = {
    hourly: { $dateTrunc: { date: "$createdAt", unit: "hour" } },
    daily: { $dateTrunc: { date: "$createdAt", unit: "day" } },
    weekly: { $dateTrunc: { date: "$createdAt", unit: "week" } },
  };

  /** 🧮 Optimized Aggregation Pipeline */
  const pipeline: PipelineStage[] = [
    // 1️⃣ Early $match for index usage
    { $match: { userId, createdAt: { $gte: startDate } } },

    // 2️⃣ Project only needed fields
    {
      $project: {
        createdAt: 1,
        totalEngagement: {
          $add: ["$likes", "$comments", "$shares", "$clicks", "$impressions"],
        },
      },
    },

    // 3️⃣ Group by time bucket (hour/day/week)
    {
      $group: {
        _id: dateTrunc[granularity],
        totalEngagement: { $sum: "$totalEngagement" },
        avgEngagement: { $avg: "$totalEngagement" },
        count: { $sum: 1 },
      },
    },

    // 4️⃣ Sort chronologically
    { $sort: { _id: 1 } },

    // 5️⃣ Facet for trend data and summary stats
    {
      $facet: {
        trendData: [
          { $project: { date: "$_id", value: "$totalEngagement", _id: 0 } },
        ],
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: "$totalEngagement" },
              average: { $avg: "$avgEngagement" },
            },
          },
        ],
      },
    },
  ];

  /** 🚀 Execute aggregation */
  const results = await Engagement.aggregate(pipeline, { allowDiskUse: true });

  const trendData = results[0]?.trendData ?? [];
  const summary = results[0]?.summary?.[0] ?? { total: 0, average: 0 };

  /** 🧾 Compute 7-day moving average */
  const dataWithMA = trendData.map((d: any, i: number, arr: any[]) => {
    const slice = arr.slice(Math.max(0, i - 6), i + 1);
    const movingAvg = slice.reduce((sum, x) => sum + x.value, 0) / slice.length;
    return {
      date: d.date,
      value: d.value,
      movingAvg: Number(movingAvg.toFixed(2)),
    };
  });

  /** 📊 Compare current vs previous period */
  const half = Math.floor(dataWithMA.length / 2);
  const prev = dataWithMA.slice(0, half);
  const curr = dataWithMA.slice(half);

  const prevTotal = prev.reduce((a: any, b: any) => a + b.value, 0);
  const currTotal = curr.reduce((a: any, b: any) => a + b.value, 0);
  const growth = ((currTotal - prevTotal) / (prevTotal || 1)) * 100;

  /** 🔝 Find peak date/value */
  const peak =
    dataWithMA.length > 0
      ? dataWithMA.reduce((max: any, d: any) => (d.value > max.value ? d : max))
      : { date: null, value: 0 };

  const response = {
    cached: false,
    data: dataWithMA,
    summary: {
      total: Math.round(summary.total),
      average: Number(summary.average.toFixed(2)),
      growth: Number(growth.toFixed(2)),
      peak,
    },
  };

  /** 💾 Save to MongoDB cache (expires automatically via TTL index) */
  await AnalyticsCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      userId,
      data: response,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
    { upsert: true }
  );

  console.log("🧠 Cached engagement trends to MongoDB");
  return res.status(200).json(response);
};

export const getPlatformPerformance = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { period = "30d" } = req.query as { period?: string };
  const userId = new mongoose.Types.ObjectId(req.user?.userId);

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  /** 🧠 Generate unique cache key */
  const cacheKey = `platform_performance_${userId}_${period}`;

  /** ⚡ Try MongoDB cache first */
  const cached = await AnalyticsCache.findOne({ cacheKey });
  if (cached && (cached.expiresAt as Date) > new Date()) {
    console.log("✅ Served from MongoDB cache");
    return res.status(200).json({ cached: true, ...cached.data });
  }

  /** 🕒 Parse period (default 30d) */
  const days = parseInt(period.replace("d", ""), 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (isNaN(days) ? 30 : days));

  /** 🧮 Aggregation Pipeline */
  const pipeline: PipelineStage[] = [
    // 1️⃣ Early match (index-optimized)
    {
      $match: {
        userId,
        createdAt: { $gte: startDate },
      },
    },

    // 2️⃣ Project minimal fields
    {
      $project: {
        platform: 1,
        likes: 1,
        comments: 1,
        shares: 1,
        clicks: 1,
        impressions: 1,
      },
    },

    // 3️⃣ Compute engagement metrics
    {
      $addFields: {
        totalEngagement: {
          $add: ["$likes", "$comments", "$shares", "$clicks"],
        },
        engagementRate: {
          $cond: [
            { $gt: ["$impressions", 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ["$likes", "$comments", "$shares"] },
                    "$impressions",
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
        clickThroughRate: {
          $cond: [
            { $gt: ["$impressions", 0] },
            { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
            0,
          ],
        },
      },
    },

    // 4️⃣ Group by platform
    {
      $group: {
        _id: "$platform",
        totalEngagement: { $sum: "$totalEngagement" },
        avgEngagementRate: { $avg: "$engagementRate" },
        avgClickThroughRate: { $avg: "$clickThroughRate" },
        totalShares: { $sum: "$shares" },
      },
    },

    // 5️⃣ Compute composite performance score
    {
      $addFields: {
        performanceScore: {
          $add: [
            { $multiply: ["$avgEngagementRate", 0.4] },
            { $multiply: ["$avgClickThroughRate", 0.3] },
            { $multiply: ["$totalShares", 0.3] },
          ],
        },
      },
    },

    // 6️⃣ Compute overall total for percentage comparison
    {
      $facet: {
        platformData: [
          {
            $project: {
              _id: 0,
              platform: "$_id",
              totalEngagement: 1,
              engagementRate: "$avgEngagementRate",
              clickThroughRate: "$avgClickThroughRate",
              performanceScore: 1,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              grandTotal: { $sum: "$totalEngagement" },
            },
          },
        ],
      },
    },
  ];

  /** 🚀 Run aggregation */
  const result = await Engagement.aggregate(pipeline, { allowDiskUse: true });

  const platformDataRaw = result[0]?.platformData ?? [];
  const totalEngagementAll = result[0]?.totals?.[0]?.grandTotal ?? 0;

  /** 7️⃣ Compute % share for each platform */
  const platformData = platformDataRaw.map((p: any) => ({
    platform: p.platform,
    totalEngagement: p.totalEngagement,
    engagementRate: Number(p.engagementRate.toFixed(2)),
    clickThroughRate: Number(p.clickThroughRate.toFixed(2)),
    performanceScore: Number(p.performanceScore.toFixed(2)),
    percentageShare:
      totalEngagementAll > 0
        ? Number(((p.totalEngagement / totalEngagementAll) * 100).toFixed(2))
        : 0,
  }));

  const response = {
    cached: false,
    period,
    data: platformData,
  };

  /** 💾 Store in MongoDB cache (auto-expire in 15 min) */
  await AnalyticsCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      userId,
      data: response,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    { upsert: true }
  );

  console.log("🧠 Cached platform performance to MongoDB");
  return res.status(200).json(response);
};

export const getTopPosts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const userId = new mongoose.Types.ObjectId(req.user?.userId);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const limit = parseInt(req.query.limit as string, 10) || 10;

  /** 🧠 Cache key for this user + limit */
  const cacheKey = `top_posts_${userId}_${limit}`;

  /** ⚡ Check MongoDB cache first */
  const cached = await AnalyticsCache.findOne({ cacheKey });
  if (cached && (cached.expiresAt as Date) > new Date()) {
    console.log("✅ Served top posts from MongoDB cache");
    return res.status(200).json({ cached: true, ...cached.data });
  }

  /** 🧮 Aggregation Pipeline */
  const pipeline: PipelineStage[] = [
    { $match: { userId } },

    {
      $project: {
        postId: 1,
        platform: 1,
        title: 1,
        createdAt: 1,
        likes: 1,
        comments: 1,
        shares: 1,
        clicks: 1,
        impressions: 1,
        totalEngagement: {
          $add: ["$likes", "$comments", "$shares", "$clicks"],
        },
        engagementRate: {
          $cond: [
            { $gt: ["$impressions", 0] },
            {
              $multiply: [
                {
                  $divide: [
                    { $add: ["$likes", "$comments", "$shares"] },
                    "$impressions",
                  ],
                },
                100,
              ],
            },
            0,
          ],
        },
      },
    },

    { $sort: { totalEngagement: -1 } },
    { $limit: limit },

    {
      $facet: {
        topPosts: [
          {
            $project: {
              postId: 1,
              title: 1,
              platform: 1,
              createdAt: 1,
              likes: 1,
              comments: 1,
              shares: 1,
              clicks: 1,
              impressions: 1,
              totalEngagement: 1,
              engagementRate: 1,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalEngagementAll: { $sum: "$totalEngagement" },
            },
          },
        ],
      },
    },
  ];

  const results = await Engagement.aggregate(pipeline, { allowDiskUse: true });

  const topPostsRaw = results[0]?.topPosts ?? [];
  const totalEngagementAll = results[0]?.totals?.[0]?.totalEngagementAll ?? 0;

  /** 🧠 Compute percentage share */
  const topPosts = topPostsRaw.map((p: any) => ({
    postId: p.postId,
    title: p.title,
    platform: p.platform,
    createdAt: p.createdAt,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    clicks: p.clicks,
    impressions: p.impressions,
    totalEngagement: p.totalEngagement,
    engagementRate: Number(p.engagementRate.toFixed(2)),
    percentageShare:
      totalEngagementAll > 0
        ? Number(((p.totalEngagement / totalEngagementAll) * 100).toFixed(2))
        : 0,
  }));

  const response = {
    cached: false,
    totalPosts: topPosts.length,
    totalEngagement: totalEngagementAll,
    data: topPosts,
  };

  /** 💾 Cache result in MongoDB (15 min TTL) */
  await AnalyticsCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      userId,
      data: response,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
    { upsert: true }
  );

  console.log("🧠 Cached top posts to MongoDB");
  return res.status(200).json(response);
};

export const getPerformanceComparison = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { startDate, endDate } = req.query;
  const userId = req.user?.userId;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "startDate and endDate are required",
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const cacheKey = `performance_comparison_${userId}_${startDate}_${endDate}`;
  const cached = await AnalyticsCache.findOne({ cacheKey });
  if (cached && (cached.expiresAt as Date) > new Date()) {
    console.log("✅ Served performance comparison from cache");
    return res.status(200).json({ cached: true, ...cached.data });
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  // Previous period (same duration)
  const diffDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - diffDays);
  const prevEnd = new Date(start);

  // Helper to aggregate metrics for a user & period
  const getMetrics = async (from: Date, to: Date) => {
    const [metrics] = await Post.aggregate([
      {
        $match: { userId, createdAt: { $gte: from, $lte: to } },
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalImpressions: { $sum: "$impressions" },
          totalEngagement: {
            $sum: { $add: ["$likes", "$comments", "$shares", "$clicks"] },
          },
        },
      },
      {
        $addFields: {
          engagementRate: {
            $cond: [
              { $gt: ["$totalImpressions", 0] },
              { $divide: ["$totalEngagement", "$totalImpressions"] },
              0,
            ],
          },
        },
      },
      { $project: { _id: 0 } },
    ]);

    return (
      metrics || {
        totalPosts: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        engagementRate: 0,
      }
    );
  };

  const current = await getMetrics(start, end);
  const previous = await getMetrics(prevStart, prevEnd);

  const calcChange = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const comparison = {
    totalPosts: {
      current: current.totalPosts,
      previous: previous.totalPosts,
      change: Number(
        calcChange(current.totalPosts, previous.totalPosts).toFixed(2)
      ),
    },
    totalImpressions: {
      current: current.totalImpressions,
      previous: previous.totalImpressions,
      change: Number(
        calcChange(current.totalImpressions, previous.totalImpressions).toFixed(
          2
        )
      ),
    },
    totalEngagement: {
      current: current.totalEngagement,
      previous: previous.totalEngagement,
      change: Number(
        calcChange(current.totalEngagement, previous.totalEngagement).toFixed(2)
      ),
    },
    engagementRate: {
      current: Number(current.engagementRate.toFixed(4)),
      previous: Number(previous.engagementRate.toFixed(4)),
      change: Number(
        calcChange(current.engagementRate, previous.engagementRate).toFixed(2)
      ),
    },
  };

  const response = { success: true, userId, data: comparison, cached: false };

  // 💾 Cache result in MongoDB (TTL: 30 min)
  await AnalyticsCache.findOneAndUpdate(
    { cacheKey },
    {
      cacheKey,
      userId,
      data: response,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
    { upsert: true }
  );

  console.log("🧠 Cached performance comparison to MongoDB");
  return res.status(200).json(response);
};
