import { Router, type RequestHandler } from "express";
import { Role } from "@prisma/client";
import type { OrderController } from "../controllers/order.controller.js";
import { requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createOrderSchema,
  orderIdParamsSchema,
} from "../validators/order.validator.js";

export function createOrderRouter(
  controller: OrderController,
  authentication: RequestHandler,
): Router {
  const router = Router();

  router.use(authentication);
  router.post(
    "/",
    requireRole(Role.STUDENT),
    validate("body", createOrderSchema),
    controller.create,
  );
  router.get("/me", requireRole(Role.STUDENT), controller.listMine);
  router.get(
    "/:id",
    requireRole(Role.STUDENT, Role.STAFF),
    validate("params", orderIdParamsSchema),
    controller.get,
  );

  return router;
}
