"use strict";
// // middlewares/authorizePostAccess.ts
// import { Response, NextFunction } from "express";
// import Post from "../models/Post"; // example
// import { AuthRequest } from "./authenticateMiddleware";
// export const authorizePostAccess = async (
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   // Admins can do anything
//   if (
//     req.user?.role !== "admin" &&
//     Post.userId.toString() !== req.user?.userId.toString()
//   ) {
//     return res
//       .status(403)
//       .json({ message: "Forbidden: You cannot access this post" });
//   }
//   next();
// };
//# sourceMappingURL=authorizePost.js.map