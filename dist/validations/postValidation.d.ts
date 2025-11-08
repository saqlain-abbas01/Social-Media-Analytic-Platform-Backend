import { z } from "zod";
export declare const createPostSchema: z.ZodObject<{
    content: z.ZodString;
    platform: z.ZodEnum<{
        twitter: "twitter";
        facebook: "facebook";
        instagram: "instagram";
        linkedin: "linkedin";
    }>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        scheduled: "scheduled";
        published: "published";
        failed: "failed";
    }>>>;
}, z.core.$strip>;
export declare const updatePostSchema: z.ZodObject<{
    content: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodEnum<{
        twitter: "twitter";
        facebook: "facebook";
        instagram: "instagram";
        linkedin: "linkedin";
    }>>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        scheduled: "scheduled";
        published: "published";
        failed: "failed";
    }>>;
}, z.core.$strip>;
export declare const getPostsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        scheduled: "scheduled";
        published: "published";
        failed: "failed";
    }>>;
    platform: z.ZodOptional<z.ZodEnum<{
        twitter: "twitter";
        facebook: "facebook";
        instagram: "instagram";
        linkedin: "linkedin";
    }>>;
    sort: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    search: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=postValidation.d.ts.map