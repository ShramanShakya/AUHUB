import type { Prisma, Product } from "@prisma/client";
import type { DescriptionGenerator } from "../../src/integrations/ai/description-generator.js";
import type { ProductRepository } from "../../src/repositories/product.repository.js";
import { ProductService } from "../../src/services/product.service.js";

const product: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  sku: "CS-JACKET-001",
  name: "Computer Science Varsity Jacket",
  description: "University Computer Science varsity jacket",
  seoDescription: null,
  category: "JACKETS",
  department: "COMPUTER_SCIENCE",
  price: 4500,
  stockQuantity: 25,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRepository() {
  const update = vi.fn(
    (
      _id: string,
      data: Prisma.ProductUpdateInput,
    ): Promise<Product> =>
      Promise.resolve({
        ...product,
        seoDescription:
          typeof data.seoDescription === "string"
            ? data.seoDescription
            : product.seoDescription,
      }),
  );
  const repository = {
    findById: vi.fn().mockResolvedValue(product),
    update,
  } as unknown as ProductRepository;
  return { repository, update };
}

describe("ProductService AI output", () => {
  it("sanitizes generated HTML before storage", async () => {
    const { repository, update } = createRepository();
    const generator: DescriptionGenerator = {
      generate: vi
        .fn()
        .mockResolvedValue(
          "<b>Celebrate Computer Science pride with this university varsity jacket, designed for campus events and everyday wear.</b>",
        ),
    };
    const service = new ProductService(repository, generator);

    const result = await service.generateDescription(product.id);

    expect(result.seoDescription).not.toContain("<b>");
    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0]?.[0]).toBe(product.id);
    const updateInput = update.mock.calls[0]?.[1];
    expect(typeof updateInput?.seoDescription).toBe("string");
    if (typeof updateInput?.seoDescription === "string") {
      expect(updateInput.seoDescription).toContain("Celebrate");
    }
  });

  it("rejects empty generated output", async () => {
    const service = new ProductService(createRepository().repository, {
      generate: vi.fn().mockResolvedValue(""),
    });

    await expect(service.generateDescription(product.id)).rejects.toMatchObject({
      status: 502,
      code: "AI_RESPONSE_INVALID",
    });
  });
});
