import { Request, Response, NextFunction } from "express";
import { ZodObject } from "zod";
export declare const validateRequest: (schema: {
    body?: ZodObject<any>;
    query?: ZodObject<any>;
    params?: ZodObject<any>;
}) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validateInputs.d.ts.map