import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticateMiddleware";
export declare const authorizeRoles: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authorizeMiddleware.d.ts.map