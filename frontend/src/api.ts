const apiBaseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
).replace(/\/$/, "");

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  seoDescription: string | null;
  category: string;
  department: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface Order {
  id: string;
  subtotal: number;
  total: number;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: Product;
  }>;
}

export interface ProductInput {
  sku: string;
  name: string;
  description: string;
  category: string;
  department: string;
  price: number;
  stockQuantity: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function apiRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiError(
      body?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { data: T };
  return body.data;
}

export const merchApi = {
  listProducts: (token: string) =>
    apiRequest<Product[]>("/project/products", token),
  createProduct: (token: string, input: ProductInput) =>
    apiRequest<Product>("/project/products", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  deactivateProduct: (token: string, id: string) =>
    apiRequest<void>(`/project/products/${id}`, token, { method: "DELETE" }),
  generateDescription: (token: string, id: string) =>
    apiRequest<Product>(
      `/project/products/${id}/generate-description`,
      token,
      { method: "POST" },
    ),
  createOrder: (
    token: string,
    items: Array<{ productId: string; quantity: number }>,
  ) =>
    apiRequest<Order>("/project/orders", token, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  listOrders: (token: string) =>
    apiRequest<Order[]>("/project/orders/me", token),
};
