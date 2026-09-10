import type { Role, User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      authUser?: Pick<User, "id" | "externalId" | "email" | "name" | "role">;
      requestId: string;
    }
  }
}

export type AuthenticatedUser = NonNullable<Express.Request["authUser"]>;
export type AppRole = Role;
