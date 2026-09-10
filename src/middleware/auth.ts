import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import type { TokenVerifier } from "../integrations/microsoft/entra-token-verifier.js";
import type { UserRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

export function authenticate(
  verifier: TokenVerifier,
  users: UserRepository,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      const authorization = request.header("authorization");
      const token = authorization?.match(BEARER_PATTERN)?.[1];
      if (!token) {
        throw new AppError(
          401,
          "AUTHENTICATION_REQUIRED",
          "A valid bearer access token is required.",
        );
      }

      const identity = await verifier.verify(token);
      const user = await users.upsertIdentity(identity);
      request.authUser = {
        id: user.id,
        externalId: user.externalId,
        email: user.email,
        name: user.name,
        role: user.role,
      };
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn("[auth] unexpected authentication failure", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
      next(
        new AppError(
          401,
          "INVALID_ACCESS_TOKEN",
          "The bearer access token is invalid.",
        ),
      );
    }
  };
}

export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.authUser) {
      next(
        new AppError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required.",
        ),
      );
      return;
    }
    if (!allowedRoles.includes(request.authUser.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action.",
        ),
      );
      return;
    }
    next();
  };
}
