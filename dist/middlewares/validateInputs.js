"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            if (schema.body)
                schema.body.parse(req.body);
            if (schema.query)
                schema.query.parse(req.query);
            if (schema.params)
                schema.params.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    message: "Validation error",
                    errors: error.flatten(),
                });
            }
            return res.status(500).json({ message: "Internal server error" });
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validateInputs.js.map