import type { Request, Response } from "express";
import type { ProductService } from "../services/product.service.js";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.validator.js";

export class ProductController {
  constructor(private readonly products: ProductService) {}

  list = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: await this.products.list() });
  };

  get = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: await this.products.get(request.params.id as string) });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const product = await this.products.create(
      request.body as CreateProductInput,
    );
    response.status(201).json({ data: product });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const product = await this.products.update(
      request.params.id as string,
      request.body as UpdateProductInput,
    );
    response.json({ data: product });
  };

  deactivate = async (request: Request, response: Response): Promise<void> => {
    await this.products.deactivate(request.params.id as string);
    response.status(204).send();
  };

  generateDescription = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const product = await this.products.generateDescription(
      request.params.id as string,
    );
    response.json({ data: product });
  };
}
