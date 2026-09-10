import "dotenv/config";

import { createDatabase } from "../src/config/database.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const database = createDatabase(databaseUrl);

try {
  await database.product.upsert({
    where: { sku: "CS-JACKET-001" },
    update: {},
    create: {
      sku: "CS-JACKET-001",
      name: "Computer Science Varsity Jacket",
      description: "University Computer Science varsity jacket",
      category: "JACKETS",
      department: "COMPUTER_SCIENCE",
      price: 4500,
      stockQuantity: 25,
    },
  });
} finally {
  await database.$disconnect();
}
