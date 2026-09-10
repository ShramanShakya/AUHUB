import { PrismaClient } from "@prisma/client";

export function createDatabase(databaseUrl: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: databaseUrl });
}
