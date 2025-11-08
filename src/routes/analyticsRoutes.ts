import express from "express";
import { asyncHandler } from "../utils/asyncErrorHandler";
import { authenticate } from "../middlewares/authenticateMiddleware";
import {
  getEngagementTrends,
  getOptimalPostingTimes,
  getPerformanceComparison,
  getPlatformPerformance,
  getRecentOverview,
  getTopPosts,
} from "../controllers/analyticsControllers";

const router = express.Router();

router.get("/overview", authenticate, asyncHandler(getRecentOverview));
router.get(
  "/optimal-times",
  authenticate,
  asyncHandler(getOptimalPostingTimes)
);
router.get("/trends", authenticate, asyncHandler(getEngagementTrends));
router.get(
  "/performance/platform",
  authenticate,
  asyncHandler(getPlatformPerformance)
);
router.get("/performance/top-posts", authenticate, asyncHandler(getTopPosts));
router.get(
  "/performance/comparison",
  authenticate,
  asyncHandler(getPerformanceComparison)
);

export default router;
