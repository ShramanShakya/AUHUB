import { z } from "zod";

const normalizedCode = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Z0-9_]+$/);

export const productIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict();

export const createProductSchema = z
  .object({
    sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2_000),
    seoDescription: z.string().trim().min(1).max(1_000).optional(),
    category: normalizedCode,
    department: normalizedCode,
    price: z.number().int().nonnegative().max(2_147_483_647),
    stockQuantity: z.number().int().nonnegative().max(2_147_483_647),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateProductSchema = createProductSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be supplied.",
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
