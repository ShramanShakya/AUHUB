import { Role } from "@prisma/client";
import type { OrderRepository } from "../repositories/order.repository.js";
import type { AuthenticatedUser } from "../types/express.js";
import type { CreateOrderInput } from "../validators/order.validator.js";
import { AppError } from "../utils/app-error.js";

export class OrderService {
  constructor(private readonly orders: OrderRepository) {}

  create(user: AuthenticatedUser, input: CreateOrderInput) {
    return this.orders.createTransactional(user.id, input.items);
  }

  listMine(user: AuthenticatedUser) {
    return this.orders.listByUser(user.id);
  }

  async get(user: AuthenticatedUser, id: string) {
    const order = await this.orders.findById(id);
    const canAccess =
      order &&
      (user.role === Role.STAFF || order.userId === user.id);
    if (!canAccess) {
      throw new AppError(
        404,
        "ORDER_NOT_FOUND",
        "The requested order does not exist.",
      );
    }
    return order;
  }
}
