import type { Request } from "express";
import type { AuthenticatedUser } from "../types/express.js";
import { AppError } from "./app-error.js";

export function getAuthUser(request: Request): AuthenticatedUser {
  if (!request.authUser) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required.",
    );
  }
  return request.authUser;
}
