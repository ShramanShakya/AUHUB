import request from "supertest";
import { Role } from "@prisma/client";
import { z } from "zod";
import { createApp } from "../../src/app.js";
import { createDatabase } from "../../src/config/database.js";
import type { AppConfig } from "../../src/config/env.js";
import { createLogger } from "../../src/config/logger.js";
import type { DescriptionGenerator } from "../../src/integrations/ai/description-generator.js";
import type { TokenVerifier } from "../../src/integrations/microsoft/entra-token-verifier.js";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://merch:merch@localhost:5433/merch_test?schema=public";
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === "true"
  ? describe
  : describe.skip;
const database = createDatabase(databaseUrl);
const logger = createLogger("test");
logger.level = "silent";

const identities = {
  "staff-token": {
    externalId: "entra-staff",
    email: "staff@example.edu",
    name: "Staff User",
    role: Role.STAFF,
  },
  "student-token": {
    externalId: "entra-student",
    email: "student@example.edu",
    name: "Student User",
    role: Role.STUDENT,
  },
  "other-token": {
    externalId: "entra-other",
    email: "other@example.edu",
    name: "Other Student",
    role: Role.STUDENT,
  },
} as const;

const tokenVerifier: TokenVerifier = {
  verify(token) {
    const identity = identities[token as keyof typeof identities];
    if (!identity) {
      return Promise.reject(new Error("Invalid test token"));
    }
    return Promise.resolve(identity);
  },
};
const descriptionGenerator: DescriptionGenerator = {
  generate() {
    return Promise.resolve(
      "Celebrate university pride with this Computer Science varsity jacket, suitable for campus events and everyday wear.",
    );
  },
};
const config: AppConfig = {
  nodeEnv: "test",
  port: 3000,
  databaseUrl,
  entra: {
    tenantId: "00000000-0000-4000-8000-000000000000",
    audience: "api://test",
    staffRole: "STAFF",
    studentRole: "STUDENT",
  },
  corsOrigins: [],
  gemini: { apiKey: "test", model: "test" },
};
const app = createApp({
  config,
  database,
  logger,
  tokenVerifier,
  descriptionGenerator,
});

async function clearDatabase() {
  await database.orderItem.deleteMany();
  await database.order.deleteMany();
  await database.product.deleteMany();
  await database.user.deleteMany();
}

describeIntegration("University Merch API", () => {
  beforeEach(clearDatabase);
  afterAll(async () => {
    await clearDatabase();
    await database.$disconnect();
  });

  it("serves public health without exposing infrastructure", async () => {
    const response = await request(app).get("/project/health").expect(200);
    expect(response.body).toEqual({ data: { status: "ok" } });
  });

  it("enforces staff role for product creation", async () => {
    const body = {
      sku: "CS-JACKET-001",
      name: "Computer Science Varsity Jacket",
      description: "University Computer Science varsity jacket",
      category: "JACKETS",
      department: "COMPUTER_SCIENCE",
      price: 4500,
      stockQuantity: 25,
    };

    await request(app)
      .post("/project/products")
      .set("authorization", "Bearer student-token")
      .send(body)
      .expect(403);

    const response = await request(app)
      .post("/project/products")
      .set("authorization", "Bearer staff-token")
      .send(body)
      .expect(201);
    expect(response.body as unknown).toMatchObject({
      data: {
        sku: body.sku,
        price: body.price,
      },
    });
  });

  it("calculates totals and decrements inventory transactionally", async () => {
    const product = await database.product.create({
      data: {
        sku: "MUG-001",
        name: "University Mug",
        description: "Ceramic university mug",
        category: "DRINKWARE",
        department: "GENERAL",
        price: 1200,
        stockQuantity: 3,
      },
    });

    const response = await request(app)
      .post("/project/orders")
      .set("authorization", "Bearer student-token")
      .send({ items: [{ productId: product.id, quantity: 2 }] })
      .expect(201);

    expect(response.body as unknown).toMatchObject({
      data: {
        subtotal: 2400,
        total: 2400,
        items: [{ quantity: 2, unitPrice: 1200, subtotal: 2400 }],
      },
    });
    await expect(
      database.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).resolves.toMatchObject({ stockQuantity: 1 });
  });

  it("hides another student's order while allowing staff access", async () => {
    const product = await database.product.create({
      data: {
        sku: "TEE-001",
        name: "University Tee",
        description: "University cotton tee",
        category: "SHIRTS",
        department: "GENERAL",
        price: 1800,
        stockQuantity: 5,
      },
    });
    const created = await request(app)
      .post("/project/orders")
      .set("authorization", "Bearer student-token")
      .send({ items: [{ productId: product.id, quantity: 1 }] })
      .expect(201);
    const createdBody = z
      .object({ data: z.object({ id: z.string().uuid() }) })
      .parse(created.body);

    await request(app)
      .get(`/project/orders/${createdBody.data.id}`)
      .set("authorization", "Bearer other-token")
      .expect(404);
    await request(app)
      .get(`/project/orders/${createdBody.data.id}`)
      .set("authorization", "Bearer staff-token")
      .expect(200);
  });

  it("rolls back an order when stock is insufficient", async () => {
    const product = await database.product.create({
      data: {
        sku: "CAP-001",
        name: "University Cap",
        description: "University embroidered cap",
        category: "HEADWEAR",
        department: "GENERAL",
        price: 1500,
        stockQuantity: 1,
      },
    });

    await request(app)
      .post("/project/orders")
      .set("authorization", "Bearer student-token")
      .send({ items: [{ productId: product.id, quantity: 2 }] })
      .expect(409);

    await expect(database.order.count()).resolves.toBe(0);
    await expect(
      database.product.findUniqueOrThrow({ where: { id: product.id } }),
    ).resolves.toMatchObject({ stockQuantity: 1 });
  });
});
