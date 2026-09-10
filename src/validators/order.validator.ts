import { z } from "zod";

export const orderIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict();

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            quantity: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict()
  .refine(
    ({ items }) =>
      new Set(items.map((item) => item.productId)).size === items.length,
    {
      message: "Each product may appear only once.",
      path: ["items"],
    },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
