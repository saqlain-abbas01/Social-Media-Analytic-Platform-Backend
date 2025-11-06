import { Request, Response, NextFunction } from "express";

export const xssProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key]
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\//g, "&#x2F;");
      }
    }
  }

  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        const sanitized = (req.query[key] as string)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\//g, "&#x2F;");
        req.query[key] = sanitized;
      }
    }
  }

  next();
};
