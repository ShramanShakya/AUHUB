import pino from "pino";

export function createLogger(nodeEnv: string) {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: [
        "req.headers.authorization",
        "headers.authorization",
        "*.password",
        "*.token",
        "*.apiKey",
        "DATABASE_URL",
        "GEMINI_API_KEY",
      ],
      censor: "[REDACTED]",
    },
    ...(nodeEnv === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, singleLine: true },
          },
        }
      : {}),
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
