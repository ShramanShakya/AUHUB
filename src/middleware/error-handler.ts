import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import type { AppLogger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", "The requested route does not exist."));
};

export function createErrorHandler(logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      appError = new AppError(
        409,
        "RESOURCE_CONFLICT",
        "A resource with the supplied unique value already exists.",
      );
    } else {
      appError = new AppError(
        500,
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
      );
    }

    const logContext = {
      requestId: request.requestId,
      method: request.method,
      route: request.originalUrl,
      status: appError.status,
      code: appError.code,
      error:
        appError.status >= 500
          ? error
          : { name: appError.name, message: appError.message },
    };

    if (appError.status >= 500) {
      logger.error(logContext, "Request failed");
    } else {
      logger.warn(logContext, "Request rejected");
    }

    response.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined
          ? {}
          : { details: appError.details }),
      },
      requestId: request.requestId,
    });
  };
}
