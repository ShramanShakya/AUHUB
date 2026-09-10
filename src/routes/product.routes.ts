import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { Role } from "@prisma/client";
import type { ProductController } from "../controllers/product.controller.js";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createProductSchema,
  productIdParamsSchema,
  updateProductSchema,
} from "../validators/product.validator.js";

export function createProductRouter(
  controller: ProductController,
  authentication: RequestHandler,
): Router {
  const router = Router();
  const aiRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.use(authentication);
  router.get("/", controller.list);
  router.get(
    "/:id",
    validate("params", productIdParamsSchema),
    controller.get,
  );
  router.post(
    "/",
    requireRole(Role.STAFF),
    validate("body", createProductSchema),
    controller.create,
  );
  router.patch(
    "/:id",
    requireRole(Role.STAFF),
    validate("params", productIdParamsSchema),
    validate("body", updateProductSchema),
    controller.update,
  );
  router.delete(
    "/:id",
    requireRole(Role.STAFF),
    validate("params", productIdParamsSchema),
    controller.deactivate,
  );
  router.post(
    "/:id/generate-description",
    aiRateLimit,
    requireRole(Role.STAFF),
    validate("params", productIdParamsSchema),
    controller.generateDescription,
  );

  return router;
}
