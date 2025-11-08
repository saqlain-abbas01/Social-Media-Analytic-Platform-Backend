"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const AnalyticsCacheSchema = new mongoose_1.Schema({
    cacheKey: { type: String, unique: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
    data: { type: mongoose_1.Schema.Types.Mixed },
    expiresAt: { type: Date, index: { expires: 0 } },
});
exports.default = (0, mongoose_1.model)("AnalyticsCache", AnalyticsCacheSchema);
//# sourceMappingURL=analyticsCache.js.map