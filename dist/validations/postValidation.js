"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostsQuerySchema = exports.updatePostSchema = exports.createPostSchema = void 0;
// src/validation/postSchema.ts
const zod_1 = require("zod");
exports.createPostSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .min(1, "Content is required")
        .max(1000, "Content must not exceed 1000 characters"),
    platform: zod_1.z
        .enum(["twitter", "facebook", "instagram", "linkedin"])
        .refine((val) => !!val, {
        message: "Invalid platform",
    }),
    scheduledAt: zod_1.z.string().optional(),
    status: zod_1.z
        .enum(["draft", "scheduled", "published", "failed"])
        .optional()
        .default("draft"),
});
exports.updatePostSchema = zod_1.z.object({
    content: zod_1.z
        .string()
        .max(1000, "Content must not exceed 1000 characters")
        .optional(),
    platform: zod_1.z.enum(["twitter", "facebook", "instagram", "linkedin"]).optional(),
    scheduledAt: zod_1.z.string().optional(),
    status: zod_1.z.enum(["draft", "scheduled", "published", "failed"]).optional(),
});
// ✅ Validation for GET /posts query params
exports.getPostsQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .regex(/^\d+$/, "Page must be a positive number")
        .optional()
        .default("1"),
    limit: zod_1.z
        .string()
        .regex(/^\d+$/, "Limit must be a positive number")
        .optional()
        .default("20"),
    status: zod_1.z.enum(["draft", "scheduled", "published", "failed"]).optional(),
    platform: zod_1.z.enum(["facebook", "twitter", "linkedin", "instagram"]).optional(),
    sort: zod_1.z
        .string()
        .regex(/^[-]?(createdAt|scheduledAt|publishedAt)$/, "Invalid sort field")
        .optional()
        .default("-createdAt"),
    search: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().datetime({ message: "Invalid startDate" }).optional(),
    endDate: zod_1.z.string().datetime({ message: "Invalid endDate" }).optional(),
});
//# sourceMappingURL=postValidation.js.map