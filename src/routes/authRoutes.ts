import express from "express";
import {
  register,
  login,
  refresh,
  logout,
} from "../controllers/authControllers";
import { validateRequest } from "../middlewares/validateInputs";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from "../validations/authValidations";
import { asyncHandler } from "../utils/asyncErrorHandler";
import { authenticate } from "../middlewares/authenticateMiddleware";

const router = express.Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  asyncHandler(register)
);
router.post("/login", validateRequest(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", validateRequest(logoutSchema), logout);

export default router;
