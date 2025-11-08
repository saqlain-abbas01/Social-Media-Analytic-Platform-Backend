"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authControllers_1 = require("../controllers/authControllers");
const validateInputs_1 = require("../middlewares/validateInputs");
const authValidations_1 = require("../validations/authValidations");
const asyncErrorHandler_1 = require("../utils/asyncErrorHandler");
const router = express_1.default.Router();
router.post("/register", (0, validateInputs_1.validateRequest)({ body: authValidations_1.registerSchema }), (0, asyncErrorHandler_1.asyncHandler)(authControllers_1.register));
router.post("/login", (0, validateInputs_1.validateRequest)({ body: authValidations_1.loginSchema }), authControllers_1.login);
router.post("/refresh", authControllers_1.refresh);
router.post("/logout", authControllers_1.logout);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map