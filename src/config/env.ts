import { z } from "zod";

import { loadProductionSecrets } from "../integrations/keyvault/key-vault.service.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  DATABASE_URL: z.string().min(1),
  ENTRA_TENANT_ID: z.string().uuid(),
  ENTRA_AUDIENCE: z.string().min(1),
  ENTRA_STAFF_ROLE: z.string().min(1).default("STAFF"),
  ENTRA_STUDENT_ROLE: z.string().min(1).default("STUDENT"),
  CORS_ORIGINS: z.string().default(""),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  KEY_VAULT_URL: z.string().url().optional(),
});

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  entra: {
    tenantId: string;
    audience: string;
    staffRole: string;
    studentRole: string;
  };
  corsOrigins: string[];
  gemini: {
    apiKey: string;
    model: string;
  };
}

export async function loadConfig(): Promise<AppConfig> {
  if (process.env.NODE_ENV !== "production") {
    await import("dotenv/config");
  } else if (process.env.KEY_VAULT_URL) {
    const secrets = await loadProductionSecrets(process.env.KEY_VAULT_URL);
    process.env.DATABASE_URL ??= secrets.databaseUrl;
    process.env.GEMINI_API_KEY ??= secrets.geminiApiKey;
  }

  const env = envSchema.parse(process.env);

  if (env.NODE_ENV === "production" && !env.KEY_VAULT_URL) {
    throw new Error("KEY_VAULT_URL is required in production");
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    entra: {
      tenantId: env.ENTRA_TENANT_ID,
      audience: env.ENTRA_AUDIENCE,
      staffRole: env.ENTRA_STAFF_ROLE,
      studentRole: env.ENTRA_STUDENT_ROLE,
    },
    corsOrigins: env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .map((origin) => origin.replace(/\/+$/, ""))
      .filter(Boolean),
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    },
  };
}
