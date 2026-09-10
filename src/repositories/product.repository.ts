import type {
  Prisma,
  PrismaClient,
  Product,
} from "@prisma/client";

export class ProductRepository {
  constructor(private readonly database: PrismaClient) {}

  listActive(): Promise<Product[]> {
    return this.database.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findActiveById(id: string): Promise<Product | null> {
    return this.database.product.findFirst({
      where: { id, isActive: true },
    });
  }

  findById(id: string): Promise<Product | null> {
    return this.database.product.findUnique({ where: { id } });
  }

  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.database.product.create({ data });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.database.product.update({ where: { id }, data });
  }

  async deactivate(id: string): Promise<Product | null> {
    const result = await this.database.product.updateMany({
      where: { id, isActive: true },
      data: { isActive: false },
    });

    return result.count === 0 ? null : this.findById(id);
  }
}
