"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validateInputs_1 = require("../middlewares/validateInputs");
const asyncErrorHandler_1 = require("../utils/asyncErrorHandler");
const authenticateMiddleware_1 = require("../middlewares/authenticateMiddleware");
const postController_1 = require("../controllers/postController");
const postValidation_1 = require("../validations/postValidation");
const router = express_1.default.Router();
router.post("/posts", authenticateMiddleware_1.authenticate, (0, validateInputs_1.validateRequest)({ body: postValidation_1.createPostSchema }), (0, asyncErrorHandler_1.asyncHandler)(postController_1.createPost));
router.get("/posts", authenticateMiddleware_1.authenticate, (0, validateInputs_1.validateRequest)({ query: postValidation_1.getPostsQuerySchema }), (0, asyncErrorHandler_1.asyncHandler)(postController_1.getPosts));
router.get("/posts/:id/analytics", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(postController_1.getPostAnalytics));
router.get("/posts/:id", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(postController_1.getPostById));
router.put("/posts/:id", authenticateMiddleware_1.authenticate, (0, validateInputs_1.validateRequest)({ body: postValidation_1.updatePostSchema }), postController_1.updatePost);
router.delete("/posts/:id", authenticateMiddleware_1.authenticate, (0, asyncErrorHandler_1.asyncHandler)(postController_1.deletePost));
exports.default = router;
//# sourceMappingURL=postRoutes.js.map