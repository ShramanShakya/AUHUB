import type { PrismaClient, Role, User } from "@prisma/client";

export interface IdentityUser {
  externalId: string;
  email: string;
  name: string;
  role: Role;
}

export class UserRepository {
  constructor(private readonly database: PrismaClient) {}

  upsertIdentity(identity: IdentityUser): Promise<User> {
    return this.database.user.upsert({
      where: { externalId: identity.externalId },
      create: identity,
      update: {
        email: identity.email,
        name: identity.name,
        role: identity.role,
      },
    });
  }
}
