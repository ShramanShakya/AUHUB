import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { AppError } from "../utils/app-error.js";

export function validate(
  location: "body" | "params" | "query",
  schema: ZodType,
): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[location]);
    if (!result.success) {
      next(
        new AppError(422, "VALIDATION_ERROR", "Request validation failed.", {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
      );
      return;
    }

    request[location] = result.data;
    next();
  };
}
