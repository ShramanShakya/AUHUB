import cors from "cors";
import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { PrismaClient } from "@prisma/client";
import type { AppConfig } from "./config/env.js";
import type { AppLogger } from "./config/logger.js";
import { OrderController } from "./controllers/order.controller.js";
import { ProductController } from "./controllers/product.controller.js";
import type { DescriptionGenerator } from "./integrations/ai/description-generator.js";
import type { TokenVerifier } from "./integrations/microsoft/entra-token-verifier.js";
import { authenticate } from "./middleware/auth.js";
import {
  createErrorHandler,
  notFoundHandler,
} from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import { OrderRepository } from "./repositories/order.repository.js";
import { ProductRepository } from "./repositories/product.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { createOrderRouter } from "./routes/order.routes.js";
import { createProductRouter } from "./routes/product.routes.js";
import { OrderService } from "./services/order.service.js";
import { ProductService } from "./services/product.service.js";

export interface AppDependencies {
  config: AppConfig;
  database: PrismaClient;
  logger: AppLogger;
  tokenVerifier: TokenVerifier;
  descriptionGenerator: DescriptionGenerator;
}

export function createApp(dependencies: AppDependencies): Express {
  const { config, database, logger, tokenVerifier, descriptionGenerator } =
    dependencies;
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => request.headers["x-request-id"] as string,
      customLogLevel: (_request, response, error) =>
        error || response.statusCode >= 500
          ? "error"
          : response.statusCode >= 400
            ? "warn"
            : "info",
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
      credentials: false,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: config.nodeEnv === "development" ? 1_000 : 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const users = new UserRepository(database);
  const products = new ProductRepository(database);
  const orders = new OrderRepository(database);
  const authentication = authenticate(tokenVerifier, users);
  const productController = new ProductController(
    new ProductService(products, descriptionGenerator),
  );
  const orderController = new OrderController(new OrderService(orders));

  app.get("/project/health", (_request, response) => {
    response.json({ data: { status: "ok" } });
  });
  app.use(
    "/project/products",
    createProductRouter(productController, authentication),
  );
  app.use(
    "/project/orders",
    createOrderRouter(orderController, authentication),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
