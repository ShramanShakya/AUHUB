import { createApp } from "./app.js";
import { createDatabase } from "./config/database.js";
import { loadConfig } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { GeminiDescriptionGenerator } from "./integrations/ai/gemini-description-generator.js";
import { EntraTokenVerifier } from "./integrations/microsoft/entra-token-verifier.js";

const config = await loadConfig();
const logger = createLogger(config.nodeEnv);
const database = createDatabase(config.databaseUrl);
const tokenVerifier = new EntraTokenVerifier(config.entra);
const descriptionGenerator = new GeminiDescriptionGenerator(
  config.gemini.apiKey,
  config.gemini.model,
);
const app = createApp({
  config,
  database,
  logger,
  tokenVerifier,
  descriptionGenerator,
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, "University Merch API started");
});

function shutDown(signal: string): void {
  logger.info({ signal }, "Shutting down");
  server.close(() => {
    void database.$disconnect().catch((error: unknown) => {
      logger.error({ error }, "Failed to disconnect from the database");
      process.exitCode = 1;
    });
  });
}

process.once("SIGTERM", () => void shutDown("SIGTERM"));
process.once("SIGINT", () => void shutDown("SIGINT"));
