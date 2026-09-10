import { createOrderSchema } from "../../src/validators/order.validator.js";
import { createProductSchema } from "../../src/validators/product.validator.js";

describe("request validators", () => {
  it("rejects client-controlled order totals", () => {
    const result = createOrderSchema.safeParse({
      items: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          quantity: 1,
        },
      ],
      total: 1,
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate products in an order", () => {
    const productId = "11111111-1111-4111-8111-111111111111";
    const result = createOrderSchema.safeParse({
      items: [
        { productId, quantity: 1 },
        { productId, quantity: 2 },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid product in minor currency units", () => {
    const result = createProductSchema.safeParse({
      sku: "CS-JACKET-001",
      name: "Computer Science Varsity Jacket",
      description: "University Computer Science varsity jacket",
      category: "JACKETS",
      department: "COMPUTER_SCIENCE",
      price: 4500,
      stockQuantity: 25,
    });

    expect(result.success).toBe(true);
  });
});
