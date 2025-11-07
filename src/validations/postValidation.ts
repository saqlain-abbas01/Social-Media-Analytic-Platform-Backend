// src/validation/postSchema.ts
import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(1000, "Content must not exceed 1000 characters"),

  platform: z
    .enum(["twitter", "facebook", "instagram", "linkedin"])
    .refine((val) => !!val, {
      message: "Invalid platform",
    }),

  scheduledAt: z.string().optional(),

  status: z
    .enum(["draft", "scheduled", "published", "failed"])
    .optional()
    .default("draft"),
});

export const updatePostSchema = z.object({
  content: z
    .string()
    .max(1000, "Content must not exceed 1000 characters")
    .optional(),
  platform: z.enum(["twitter", "facebook", "instagram", "linkedin"]).optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
});

// ✅ Validation for GET /posts query params
export const getPostsQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, "Page must be a positive number")
    .optional()
    .default("1"),
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a positive number")
    .optional()
    .default("20"),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  platform: z.enum(["facebook", "twitter", "linkedin", "instagram"]).optional(),
  sort: z
    .string()
    .regex(/^[-]?(createdAt|scheduledAt|publishedAt)$/, "Invalid sort field")
    .optional()
    .default("-createdAt"),
  search: z.string().trim().optional(),
  startDate: z.string().datetime({ message: "Invalid startDate" }).optional(),
  endDate: z.string().datetime({ message: "Invalid endDate" }).optional(),
});
