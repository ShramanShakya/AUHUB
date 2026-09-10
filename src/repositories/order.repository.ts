import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { AppError } from "../utils/app-error.js";

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

export class OrderRepository {
  constructor(private readonly database: PrismaClient) {}

  async createTransactional(
    userId: string,
    items: OrderItemInput[],
  ): Promise<OrderWithItems> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.database.$transaction(
          async (transaction) => {
            const products = await transaction.product.findMany({
              where: {
                id: { in: items.map((item) => item.productId) },
                isActive: true,
              },
            });

            if (products.length !== items.length) {
              throw new AppError(
                404,
                "PRODUCT_NOT_FOUND",
                "One or more requested products do not exist.",
              );
            }

            const productsById = new Map(
              products.map((product) => [product.id, product]),
            );
            const orderItems = items.map((item) => {
              const product = productsById.get(item.productId);
              if (!product) {
                throw new AppError(
                  404,
                  "PRODUCT_NOT_FOUND",
                  "One or more requested products do not exist.",
                );
              }
              const subtotal = product.price * item.quantity;
              if (!Number.isSafeInteger(subtotal)) {
                throw new AppError(
                  422,
                  "ORDER_TOTAL_INVALID",
                  "The calculated order total is invalid.",
                );
              }
              return {
                productId: product.id,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal,
              };
            });

            const subtotal = orderItems.reduce(
              (total, item) => total + item.subtotal,
              0,
            );
            if (!Number.isSafeInteger(subtotal)) {
              throw new AppError(
                422,
                "ORDER_TOTAL_INVALID",
                "The calculated order total is invalid.",
              );
            }

            for (const item of items) {
              const update = await transaction.product.updateMany({
                where: {
                  id: item.productId,
                  isActive: true,
                  stockQuantity: { gte: item.quantity },
                },
                data: { stockQuantity: { decrement: item.quantity } },
              });
              if (update.count !== 1) {
                throw new AppError(
                  409,
                  "INSUFFICIENT_STOCK",
                  "A requested product does not have enough stock.",
                );
              }
            }

            return transaction.order.create({
              data: {
                userId,
                subtotal,
                total: subtotal,
                items: { create: orderItems },
              },
              include: { items: { include: { product: true } } },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const canRetry =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 3;
        if (!canRetry) {
          throw error;
        }
      }
    }

    throw new AppError(
      409,
      "ORDER_CONFLICT",
      "The order could not be completed due to concurrent changes.",
    );
  }

  listByUser(userId: string): Promise<OrderWithItems[]> {
    return this.database.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(id: string): Promise<OrderWithItems | null> {
    return this.database.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }
}
