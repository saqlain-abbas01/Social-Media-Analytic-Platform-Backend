"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentOverview = exports.getPerformanceComparison = exports.getTopPosts = exports.getPlatformPerformance = exports.getEngagementTrends = exports.getOptimalPostingTimes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const engagementModel_1 = __importDefault(require("../models/engagementModel"));
const analyticsCache_1 = __importDefault(require("../models/analyticsCache"));
const postModel_1 = require("../models/postModel");
const getOptimalPostingTimes = async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.user?.userId);
    const cacheKey = `optimal_times_${userId}`;
    // 1️⃣ Try MongoDB cache first
    // const cached = await AnalyticsCache.findOne({ cacheKey });
    // if (cached && (cached.expiresAt as Date) > new Date()) {
    //   return res.json({ cached: true, data: cached.data });
    // }
    // 2️⃣ Analyze past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const pipeline = [
        { $match: { userId, timestamp: { $gte: thirtyDaysAgo } } },
        // Project required fields, ensure 0 for missing values
        {
            $project: {
                likes: { $ifNull: ["$metrics.likes", 0] },
                comments: { $ifNull: ["$metrics.comments", 0] },
                shares: { $ifNull: ["$metrics.shares", 0] },
                clicks: { $ifNull: ["$metrics.clicks", 0] },
                impressions: { $ifNull: ["$metrics.impressions", 0] },
                timestamp: 1,
                dayOfWeek: { $dayOfWeek: "$timestamp" },
                hourOfDay: { $hour: "$timestamp" },
            },
        },
        // Compute totalEngagement and rates safely
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
        // Sort by performance descending
        { $sort: { performanceScore: -1 } },
        { $limit: 5 },
        // Project readable response
        {
            $project: {
                _id: 0,
                dayOfWeek: "$_id.dayOfWeek", // 1 = Sunday, 7 = Saturday
                hourOfDay: "$_id.hourOfDay",
                avgEngagement: { $round: ["$avgEngagement", 2] },
                avgEngagementRate: { $round: ["$avgEngagementRate", 2] },
                avgCTR: { $round: ["$avgCTR", 2] },
                performanceScore: { $round: ["$performanceScore", 2] },
                sampleSize: 1,
            },
        },
    ];
    const results = await engagementModel_1.default.aggregate(pipeline, { allowDiskUse: true });
    // Cache for 1 hour
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: results,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }, { upsert: true });
    return res.json({ cached: false, data: results });
};
exports.getOptimalPostingTimes = getOptimalPostingTimes;
const getEngagementTrends = async (req, res) => {
    const { period = "30d", granularity = "daily", metric = "engagement", } = req.query;
    // validate granularity
    const allowedGran = ["hourly", "daily", "weekly"];
    const gran = allowedGran.includes(granularity) ? granularity : "daily";
    // parse period (accept "30d" or "30")
    const daysRaw = String(period).replace(/\s+/g, "").replace(/d$/i, "");
    const days = Math.max(1, parseInt(daysRaw || "30", 10) || 30);
    const userIdStr = req.user?.userId;
    if (!userIdStr)
        return res.status(401).json({ message: "Unauthorized" });
    const userId = new mongoose_1.default.Types.ObjectId(userIdStr);
    // cache key
    const cacheKey = `engagement_trends_${userId.toString()}_${days}d_${gran}_${metric}`;
    // try cache
    const cached = await analyticsCache_1.default.findOne({ cacheKey }).lean();
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
        return res.status(200).json({ cached: true, ...cached.data });
    }
    // start date
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    // dateTrunc definitions using timestamp
    const dateTrunc = {
        hourly: { $dateTrunc: { date: "$timestamp", unit: "hour" } },
        daily: { $dateTrunc: { date: "$timestamp", unit: "day" } },
        weekly: { $dateTrunc: { date: "$timestamp", unit: "week" } },
    };
    // Aggregation pipeline — note the $ifNull guards for metrics
    const pipeline = [
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
            $project: {
                timestamp: 1,
                // treat missing metrics as 0
                totalEngagement: {
                    $add: [
                        { $ifNull: ["$metrics.likes", 0] },
                        { $ifNull: ["$metrics.comments", 0] },
                        { $ifNull: ["$metrics.shares", 0] },
                        { $ifNull: ["$metrics.clicks", 0] },
                        { $ifNull: ["$metrics.impressions", 0] },
                    ],
                },
            },
        },
        // group by truncated timestamp
        {
            $group: {
                _id: dateTrunc[gran],
                totalEngagement: { $sum: { $ifNull: ["$totalEngagement", 0] } },
                avgEngagement: { $avg: { $ifNull: ["$totalEngagement", 0] } },
                count: { $sum: 1 },
            },
        },
        // ensure chronological order
        { $sort: { _id: 1 } },
        // facet trend + summary
        {
            $facet: {
                trendData: [
                    {
                        $project: {
                            // convert _id (Date) to ISO string to ensure frontend receives stable value
                            date: {
                                $dateToString: {
                                    date: "$_id",
                                    format: "%Y-%m-%dT%H:%M:%S.%LZ",
                                },
                            },
                            value: { $ifNull: ["$totalEngagement", 0] },
                            _id: 0,
                        },
                    },
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
    const results = await engagementModel_1.default.aggregate(pipeline)
        .allowDiskUse(true)
        .exec();
    const trendDataRaw = results?.[0]?.trendData ?? [];
    const summaryRaw = results?.[0]?.summary?.[0] ?? { total: 0, average: 0 };
    // ensure numeric values and sort by date just in case
    const trendData = trendDataRaw
        .map((d) => ({
        date: d.date,
        value: Number(d.value || 0),
    }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // 7-period moving average (use window size depending on granularity if needed)
    const windowSize = gran === "hourly" ? 24 : 7;
    const dataWithMA = trendData.map((d, i, arr) => {
        const slice = arr.slice(Math.max(0, i - (windowSize - 1)), i + 1);
        const movingAvg = slice.reduce((s, x) => s + x.value, 0) / (slice.length || 1);
        return {
            date: d.date,
            value: d.value,
            movingAvg: Number(movingAvg.toFixed(2)),
        };
    });
    // split current vs previous period halves safely
    const half = Math.floor(dataWithMA.length / 2) || 0;
    const prev = dataWithMA.slice(0, half);
    const curr = dataWithMA.slice(half);
    const prevTotal = prev.reduce((a, b) => a + (b.value || 0), 0);
    const currTotal = curr.reduce((a, b) => a + (b.value || 0), 0);
    // safer growth calculation
    let growth;
    if (prevTotal === 0 && currTotal === 0)
        growth = 0;
    else if (prevTotal === 0 && currTotal > 0)
        growth = 100;
    else
        growth = ((currTotal - prevTotal) / prevTotal) * 100;
    // find peak
    const peak = dataWithMA.length
        ? dataWithMA.reduce((max, d) => (d.value > max.value ? d : max))
        : { date: null, value: 0 };
    const response = {
        cached: false,
        data: dataWithMA,
        summary: {
            total: Math.round(summaryRaw.total || 0),
            average: Number((summaryRaw.average || 0).toFixed(2)),
            growth: Number(growth.toFixed(2)),
            peak,
        },
    };
    // save cache (TTL handled by expiresAt index)
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: response,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    }, { upsert: true });
    return res.status(200).json(response);
};
exports.getEngagementTrends = getEngagementTrends;
const getPlatformPerformance = async (req, res) => {
    const { period = "30d" } = req.query;
    const userId = new mongoose_1.default.Types.ObjectId(req.user?.userId);
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    /** 🧠 Generate unique cache key */
    const cacheKey = `platform_performance_${userId}_${period}`;
    /** ⚡ Try MongoDB cache first */
    const cached = await analyticsCache_1.default.findOne({ cacheKey });
    if (cached && cached.expiresAt > new Date()) {
        return res.status(200).json({ cached: true, ...cached.data });
    }
    /** 🕒 Parse period (default 30d) */
    const days = parseInt(period.replace("d", ""), 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (isNaN(days) ? 30 : days));
    /** 🧮 Aggregation Pipeline */
    const pipeline = [
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
            $project: {
                platform: 1,
                likes: { $ifNull: ["$metrics.likes", 0] },
                comments: { $ifNull: ["$metrics.comments", 0] },
                shares: { $ifNull: ["$metrics.shares", 0] },
                clicks: { $ifNull: ["$metrics.clicks", 0] },
                impressions: { $ifNull: ["$metrics.impressions", 0] },
            },
        },
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
        {
            $group: {
                _id: "$platform",
                totalEngagement: { $sum: "$totalEngagement" },
                avgEngagementRate: { $avg: "$engagementRate" },
                avgClickThroughRate: { $avg: "$clickThroughRate" },
                totalShares: { $sum: "$shares" },
            },
        },
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
                    { $group: { _id: null, grandTotal: { $sum: "$totalEngagement" } } },
                ],
            },
        },
    ];
    /** 🚀 Run aggregation */
    const result = await engagementModel_1.default.aggregate(pipeline, { allowDiskUse: true });
    const platformDataRaw = result[0]?.platformData ?? [];
    const totalEngagementAll = result[0]?.totals?.[0]?.grandTotal ?? 0;
    /** 7️⃣ Compute % share for each platform */
    const platformData = platformDataRaw.map((p) => ({
        platform: p.platform,
        totalEngagement: p.totalEngagement,
        engagementRate: Number(p.engagementRate.toFixed(2)),
        clickThroughRate: Number(p.clickThroughRate.toFixed(2)),
        performanceScore: Number(p.performanceScore.toFixed(2)),
        percentageShare: totalEngagementAll > 0
            ? Number(((p.totalEngagement / totalEngagementAll) * 100).toFixed(2))
            : 0,
    }));
    const response = {
        cached: false,
        period,
        data: platformData,
    };
    /** 💾 Store in MongoDB cache (auto-expire in 15 min) */
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: response,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }, { upsert: true });
    console.log("🧠 Cached platform performance to MongoDB");
    return res.status(200).json(response);
};
exports.getPlatformPerformance = getPlatformPerformance;
const getTopPosts = async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.user?.userId);
    if (!userId)
        return res.status(401).json({ message: "Unauthorized" });
    const limit = parseInt(req.query.limit, 10) || 10;
    const cacheKey = `top_posts_${userId}_${limit}`;
    // 🔹 Optional: check cache first
    const cached = await analyticsCache_1.default.findOne({ cacheKey });
    if (cached && cached.expiresAt > new Date()) {
        return res.status(200).json({ cached: true, ...cached.data });
    }
    /** 🧮 Aggregation Pipeline */
    const pipeline = [
        { $match: { userId } },
        // 1️⃣ Group all engagement per post to sum historical metrics
        {
            $group: {
                _id: "$postId",
                platform: { $first: "$platform" },
                totalLikes: { $sum: "$metrics.likes" },
                totalComments: { $sum: "$metrics.comments" },
                totalShares: { $sum: "$metrics.shares" },
                totalClicks: { $sum: "$metrics.clicks" },
                totalImpressions: { $sum: { $ifNull: ["$metrics.impressions", 0] } },
            },
        },
        // 2️⃣ Lookup post info
        {
            $lookup: {
                from: "posts",
                localField: "_id",
                foreignField: "_id",
                as: "post",
            },
        },
        { $unwind: "$post" },
        // 3️⃣ Project calculated fields
        {
            $project: {
                postId: "$_id",
                title: "$post.content", // or "$post.title"
                platform: 1,
                createdAt: "$post.createdAt",
                totalEngagement: {
                    $add: [
                        "$totalLikes",
                        "$totalComments",
                        "$totalShares",
                        "$totalClicks",
                    ],
                },
                totalImpressions: "$totalImpressions",
                engagementRate: {
                    $cond: [
                        { $gt: ["$totalImpressions", 0] },
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        {
                                            $add: ["$totalLikes", "$totalComments", "$totalShares"],
                                        },
                                        "$totalImpressions",
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
                        { $gt: ["$totalImpressions", 0] },
                        {
                            $multiply: [
                                { $divide: ["$totalClicks", "$totalImpressions"] },
                                100,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
        // 4️⃣ Sort by total engagement descending
        { $sort: { totalEngagement: -1 } },
        // 5️⃣ Limit to top N posts
        { $limit: limit },
        // 6️⃣ Compute grand total for percentage share
        {
            $group: {
                _id: null,
                topPosts: { $push: "$$ROOT" },
                totalEngagementAll: { $sum: "$totalEngagement" },
            },
        },
        { $unwind: "$topPosts" },
        {
            $project: {
                _id: 0,
                postId: "$topPosts.postId",
                title: "$topPosts.title",
                platform: "$topPosts.platform",
                createdAt: "$topPosts.createdAt",
                totalEngagement: "$topPosts.totalEngagement",
                totalImpressions: "$topPosts.totalImpressions",
                engagementRate: { $round: ["$topPosts.engagementRate", 2] },
                clickThroughRate: { $round: ["$topPosts.clickThroughRate", 2] },
                percentageShare: {
                    $cond: [
                        { $gt: ["$totalEngagementAll", 0] },
                        {
                            $round: [
                                {
                                    $multiply: [
                                        {
                                            $divide: [
                                                "$topPosts.totalEngagement",
                                                "$totalEngagementAll",
                                            ],
                                        },
                                        100,
                                    ],
                                },
                                2,
                            ],
                        },
                        0,
                    ],
                },
            },
        },
    ];
    const results = await engagementModel_1.default.aggregate(pipeline, {
        allowDiskUse: true,
    });
    const response = {
        cached: false,
        totalPosts: results.length,
        totalEngagement: results.reduce((sum, r) => sum + r.totalEngagement, 0),
        data: results,
    };
    // 🔹 Cache in MongoDB (optional)
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: response,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }, { upsert: true });
    return res.status(200).json(response);
};
exports.getTopPosts = getTopPosts;
const getPerformanceComparison = async (req, res) => {
    const userId = req.user?.userId;
    const now = new Date();
    // ✅ Handle null or undefined startDate / endDate safely
    let startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : null;
    let endDate = req.query.endDate
        ? new Date(req.query.endDate)
        : null;
    // ✅ Fallback to last 30 days if missing or invalid
    if (!endDate || isNaN(endDate.getTime()))
        endDate = new Date(now);
    if (!startDate || isNaN(startDate.getTime())) {
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 30);
    }
    // ✅ Normalize to start/end of the day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const platform = req.query.platform;
    // Cache key based on final computed dates and platform
    const cacheKey = `performance_comparison_${userId}_${platform || "all"}_${startDate.toISOString()}_${endDate.toISOString()}`;
    // const cached = await AnalyticsCache.findOne({ cacheKey });
    // if (cached && (cached.expiresAt as Date) > new Date()) {
    //   console.log("✅ Served performance comparison from cache");
    //   return res.status(200).json({ cached: true, ...cached.data });
    // }
    // ✅ Previous period (same duration)
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(startDate);
    const prevStart = new Date(startDate);
    prevStart.setDate(startDate.getDate() - diffDays);
    // ✅ Helper: Aggregate metrics from Engagement collection
    const getMetrics = async (from, to) => {
        const matchQuery = {
            userId: new mongoose_1.default.Types.ObjectId(userId),
            timestamp: { $gte: from, $lte: to },
        };
        // ✅ Apply platform filter if provided
        if (platform && platform !== "all") {
            matchQuery.platform = platform;
        }
        const [metrics] = await engagementModel_1.default.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalPosts: { $addToSet: "$postId" }, // unique posts
                    totalImpressions: { $sum: "$metrics.impressions" },
                    totalLikes: { $sum: "$metrics.likes" },
                    totalComments: { $sum: "$metrics.comments" },
                    totalShares: { $sum: "$metrics.shares" },
                    totalClicks: { $sum: "$metrics.clicks" },
                },
            },
            {
                $addFields: {
                    totalPosts: { $size: "$totalPosts" },
                    totalEngagement: {
                        $add: [
                            "$totalLikes",
                            "$totalComments",
                            "$totalShares",
                            "$totalClicks",
                        ],
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
        return (metrics || {
            totalPosts: 0,
            totalImpressions: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalClicks: 0,
            totalEngagement: 0,
            engagementRate: 0,
        });
    };
    const current = await getMetrics(startDate, endDate);
    const previous = await getMetrics(prevStart, prevEnd);
    // ✅ Percentage change calculator
    const calcChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const comparison = {
        totalPosts: {
            current: current.totalPosts,
            previous: previous.totalPosts,
            change: calcChange(current.totalPosts, previous.totalPosts),
        },
        totalImpressions: {
            current: current.totalImpressions,
            previous: previous.totalImpressions,
            change: calcChange(current.totalImpressions, previous.totalImpressions),
        },
        totalLikes: {
            current: current.totalLikes,
            previous: previous.totalLikes,
            change: calcChange(current.totalLikes, previous.totalLikes),
        },
        totalComments: {
            current: current.totalComments,
            previous: previous.totalComments,
            change: calcChange(current.totalComments, previous.totalComments),
        },
        totalShares: {
            current: current.totalShares,
            previous: previous.totalShares,
            change: calcChange(current.totalShares, previous.totalShares),
        },
        totalEngagement: {
            current: current.totalEngagement,
            previous: previous.totalEngagement,
            change: calcChange(current.totalEngagement, previous.totalEngagement),
        },
        engagementRate: {
            current: Number(current.engagementRate.toFixed(4)),
            previous: Number(previous.engagementRate.toFixed(4)),
            change: calcChange(current.engagementRate, previous.engagementRate),
        },
    };
    const response = {
        success: true,
        userId,
        platform: platform || "all",
        data: comparison,
        cached: false,
    };
    // 💾 Cache for 30 minutes
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: response,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }, { upsert: true });
    console.log("🧠 Cached performance comparison to MongoDB");
    return res.status(200).json(response);
};
exports.getPerformanceComparison = getPerformanceComparison;
const getRecentOverview = async (req, res) => {
    const userIdStr = req.user?.userId;
    if (!userIdStr)
        return res.status(401).json({ message: "Unauthorized" });
    const userId = new mongoose_1.default.Types.ObjectId(userIdStr);
    const cacheKey = `recent_overview_${userId}`;
    // Try cache first
    const cached = await analyticsCache_1.default.findOne({ cacheKey }).lean();
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
        return res.status(200).json({ cached: true, ...cached.data });
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    // 🧮 Aggregation for current 30 days and previous 30 days
    const pipeline = [
        {
            $match: { userId, timestamp: { $gte: sixtyDaysAgo } },
        },
        {
            $project: {
                likes: { $ifNull: ["$metrics.likes", 0] },
                comments: { $ifNull: ["$metrics.comments", 0] },
                shares: { $ifNull: ["$metrics.shares", 0] },
                clicks: { $ifNull: ["$metrics.clicks", 0] },
                impressions: { $ifNull: ["$metrics.impressions", 0] },
                period: {
                    $cond: [
                        { $gte: ["$timestamp", thirtyDaysAgo] },
                        "current",
                        "previous",
                    ],
                },
            },
        },
        {
            $group: {
                _id: "$period",
                totalLikes: { $sum: "$likes" },
                totalComments: { $sum: "$comments" },
                totalShares: { $sum: "$shares" },
                totalClicks: { $sum: "$clicks" },
                totalImpressions: { $sum: "$impressions" },
            },
        },
    ];
    const results = await engagementModel_1.default.aggregate(pipeline).exec();
    const current = results.find((r) => r._id === "current") || {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalClicks: 0,
        totalImpressions: 0,
    };
    const previous = results.find((r) => r._id === "previous") || {
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalClicks: 0,
        totalImpressions: 0,
    };
    // Count posts
    const currentPosts = await postModel_1.Post.countDocuments({
        userId,
        createdAt: { $gte: thirtyDaysAgo },
    });
    const previousPosts = await postModel_1.Post.countDocuments({
        userId,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });
    // Helper function to calculate change %
    const calcChange = (currentVal, previousVal) => {
        if (previousVal === 0 && currentVal === 0)
            return 0;
        if (previousVal === 0 && currentVal > 0)
            return 100;
        return ((currentVal - previousVal) / previousVal) * 100;
    };
    const responseData = {
        cached: false,
        totalPosts: {
            current: currentPosts,
            previous: previousPosts,
            change: Number(calcChange(currentPosts, previousPosts).toFixed(2)),
        },
        totalEngagement: {
            current: current.totalLikes +
                current.totalComments +
                current.totalShares +
                current.totalClicks,
            previous: previous.totalLikes +
                previous.totalComments +
                previous.totalShares +
                previous.totalClicks,
            change: Number(calcChange(current.totalLikes +
                current.totalComments +
                current.totalShares +
                current.totalClicks, previous.totalLikes +
                previous.totalComments +
                previous.totalShares +
                previous.totalClicks).toFixed(2)),
        },
        totalLikes: {
            current: current.totalLikes,
            previous: previous.totalLikes,
            change: Number(calcChange(current.totalLikes, previous.totalLikes).toFixed(2)),
        },
        totalComments: {
            current: current.totalComments,
            previous: previous.totalComments,
            change: Number(calcChange(current.totalComments, previous.totalComments).toFixed(2)),
        },
        totalShares: {
            current: current.totalShares,
            previous: previous.totalShares,
            change: Number(calcChange(current.totalShares, previous.totalShares).toFixed(2)),
        },
        totalClicks: {
            current: current.totalClicks,
            previous: previous.totalClicks,
            change: Number(calcChange(current.totalClicks, previous.totalClicks).toFixed(2)),
        },
        totalImpressions: {
            current: current.totalImpressions,
            previous: previous.totalImpressions,
            change: Number(calcChange(current.totalImpressions, previous.totalImpressions).toFixed(2)),
        },
    };
    // Cache for 15 minutes
    await analyticsCache_1.default.findOneAndUpdate({ cacheKey }, {
        cacheKey,
        userId,
        data: responseData,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }, { upsert: true });
    return res.status(200).json(responseData);
};
exports.getRecentOverview = getRecentOverview;
//# sourceMappingURL=analyticsControllers.js.map