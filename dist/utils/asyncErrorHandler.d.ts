import { Request, Response, NextFunction, RequestHandler } from "express";
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;
/**
 * Wrap async route handlers to catch errors and pass them to Express error middleware
 */
export declare const asyncHandler: (fn: AsyncHandler) => RequestHandler;
export {};
//# sourceMappingURL=asyncErrorHandler.d.ts.map