// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token as string, ACCESS_TOKEN_SECRET);

    // ✅ Type guard: ensure decoded is an object and contains our fields
    if (
      typeof decoded === "object" &&
      "userId" in decoded &&
      "role" in decoded
    ) {
      req.user = {
        userId: decoded.userId as string,
        role: decoded.role as string,
      };
      return next();
    }

    return res.status(403).json({ message: "Invalid token payload" });
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
