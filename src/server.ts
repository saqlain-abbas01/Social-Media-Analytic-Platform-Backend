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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
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

app.use("/api/auth", authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
