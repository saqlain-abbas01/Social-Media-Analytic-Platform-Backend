import express from "express";
import { validateRequest } from "../middlewares/validateInputs";
import { asyncHandler } from "../utils/asyncErrorHandler";
import { authenticate } from "../middlewares/authenticateMiddleware";
import {
  createPost,
  deletePost,
  getPostAnalytics,
  getPostById,
  getPosts,
  updatePost,
} from "../controllers/postController";
import {
  createPostSchema,
  getPostsQuerySchema,
  updatePostSchema,
} from "../validations/postValidation";

const router = express.Router();

router.post(
  "/posts",
  authenticate,
  validateRequest({ body: createPostSchema }),
  asyncHandler(createPost)
);
router.get(
  "/posts",
  authenticate,
  validateRequest({ query: getPostsQuerySchema }),
  asyncHandler(getPosts)
);
router.get(
  "/posts/:id/analytics",
  authenticate,
  asyncHandler(getPostAnalytics)
);
router.get("/posts/:id", authenticate, asyncHandler(getPostById));
router.put(
  "/posts/:id",
  authenticate,
  validateRequest({ body: updatePostSchema }),
  updatePost
);

router.delete("/posts/:id", authenticate, asyncHandler(deletePost));

export default router;
