import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { DescriptionGenerator } from "../integrations/ai/description-generator.js";
import type { ProductRepository } from "../repositories/product.repository.js";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.validator.js";
import { AppError } from "../utils/app-error.js";

const generatedDescriptionSchema = z.string().min(40).max(1_000);

function sanitizeGeneratedText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    // Remove control characters before generated content reaches storage.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly descriptionGenerator: DescriptionGenerator,
  ) {}

  list() {
    return this.products.listActive();
  }

  async get(id: string) {
    const product = await this.products.findActiveById(id);
    if (!product) {
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "The requested product does not exist.",
      );
    }
    return product;
  }

  create(input: CreateProductInput) {
    return this.products.create({
      sku: input.sku,
      name: input.name,
      description: input.description,
      category: input.category,
      department: input.department,
      price: input.price,
      stockQuantity: input.stockQuantity,
      ...(input.seoDescription === undefined
        ? {}
        : { seoDescription: input.seoDescription }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    });
  }

  async update(id: string, input: UpdateProductInput) {
    const product = await this.products.findById(id);
    if (!product) {
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "The requested product does not exist.",
      );
    }
    const data = Object.fromEntries(
      Object.entries(input).filter((entry) => entry[1] !== undefined),
    ) as Prisma.ProductUpdateInput;
    return this.products.update(id, data);
  }

  async deactivate(id: string) {
    const product = await this.products.deactivate(id);
    if (!product) {
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "The requested active product does not exist.",
      );
    }
    return product;
  }

  async generateDescription(id: string) {
    const product = await this.products.findById(id);
    if (!product || !product.isActive) {
      throw new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "The requested product does not exist.",
      );
    }

    const generated = await this.descriptionGenerator.generate({
      name: product.name,
      category: product.category,
      department: product.department,
      description: product.description,
    });
    const validation = generatedDescriptionSchema.safeParse(
      sanitizeGeneratedText(generated),
    );
    if (!validation.success) {
      throw new AppError(
        502,
        "AI_RESPONSE_INVALID",
        "The AI provider returned an invalid description.",
      );
    }

    return this.products.update(id, {
      seoDescription: validation.data,
    });
  }
}
