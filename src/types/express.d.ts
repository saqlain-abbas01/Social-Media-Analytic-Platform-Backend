import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      role: string;
    };
  }
}
