// middlewares/authorizeRoles.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticateMiddleware";

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient role privileges" });
    }
    next();
  };
};
