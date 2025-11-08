"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const asyncErrorHandler_1 = require("../utils/asyncErrorHandler");
const authenticateMiddleware_1 = require("../middlewares/authenticateMiddleware");
const analyticsControllers_1 = require("../controllers/analyticsControllers");
const router = express_1.default.Router();
router.get("/overview", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getRecentOverview));
router.get("/optimal-times", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getOptimalPostingTimes));
router.get("/trends", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getEngagementTrends));
router.get("/performance/platform", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getPlatformPerformance));
router.get("/performance/top-posts", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getTopPosts));
router.get("/performance/comparison", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(analyticsControllers_1.getPerformanceComparison));
exports.default = router;
//# sourceMappingURL=analyticsRoutes.js.map