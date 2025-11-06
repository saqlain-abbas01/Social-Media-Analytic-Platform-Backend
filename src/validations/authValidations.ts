// validations/authValidation.ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password too long"),
  role: z.enum(["admin", "user"]).optional().default("user"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const logoutSchema = z.object({
  refreshToken: z.string(),
});
