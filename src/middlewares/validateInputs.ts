// middlewares/validateRequest.ts
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.errors });
    }
  };
};
