"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssProtection = void 0;
const xssProtection = (req, res, next) => {
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
                const sanitized = req.query[key]
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
exports.xssProtection = xssProtection;
//# sourceMappingURL=xssProtection.js.map