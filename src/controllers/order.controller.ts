import type { Request, Response } from "express";
import type { OrderService } from "../services/order.service.js";
import { getAuthUser } from "../utils/auth-user.js";
import type { CreateOrderInput } from "../validators/order.validator.js";

export class OrderController {
  constructor(private readonly orders: OrderService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const order = await this.orders.create(
      getAuthUser(request),
      request.body as CreateOrderInput,
    );
    response.status(201).json({ data: order });
  };

  listMine = async (request: Request, response: Response): Promise<void> => {
    const orders = await this.orders.listMine(getAuthUser(request));
    response.json({ data: orders });
  };

  get = async (request: Request, response: Response): Promise<void> => {
    const order = await this.orders.get(
      getAuthUser(request),
      request.params.id as string,
    );
    response.json({ data: order });
  };
}
