"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const connection_1 = require("./db/connection");
const errorHandler_1 = require("./middlewares/errorHandler");
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const publishPostJobs_1 = require("./jobs/publishPostJobs");
require("./jobs/engagementSimulation");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((req, res, next) => {
    try {
        if (req.body)
            express_mongo_sanitize_1.default.sanitize(req.body);
        if (req.params)
            express_mongo_sanitize_1.default.sanitize(req.params);
        if (req.query)
            express_mongo_sanitize_1.default.sanitize(req.query);
    }
    catch (err) {
        console.error("Sanitization error:", err);
    }
    next();
});
(0, connection_1.connectDB)();
app.use("/api", postRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/analytics", analyticsRoutes_1.default);
(0, publishPostJobs_1.startPublishPostsJob)();
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map