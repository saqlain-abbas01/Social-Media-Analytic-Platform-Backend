// middlewares/authorizePostAccess.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticate";
import Post from "../models/Post"; // example

export const authorizePostAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Admins can do anything
  if (
    req.user?.role !== "admin" &&
    post.userId.toString() !== req.user?.userId.toString()
  ) {
    return res
      .status(403)
      .json({ message: "Forbidden: You cannot access this post" });
  }

  next();
};
