import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./db/connection";
import { errorHandler } from "./middlewares/errorHandler";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import { startPublishPostsJob } from "./jobs/publishPostJobs";
import "./jobs/engagementSimulation";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_FRONTEND_URL
    : process.env.DEV_FRONTEND_URL;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: allowedOrigin,
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(helmet());
app.use((req, res, next) => {
  try {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.params) mongoSanitize.sanitize(req.params);
    if (req.query) mongoSanitize.sanitize(req.query);
  } catch (err) {
    console.error("Sanitization error:", err);
  }
  next();
});

connectDB();

app.use("/api", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);

startPublishPostsJob();

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
