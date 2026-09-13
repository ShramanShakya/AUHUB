const apiBaseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
).replace(/\/$/, "");

export type Role = "STUDENT" | "STAFF" | "ADMIN";
export type OrderStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export interface GenerateDescriptionInput {
  name: string;
  category: string;
}

export interface GenerateDescriptionResult {
  description: string;
}
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
}

export interface AdminUser extends User {
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  active: boolean;
  category: Category;
}

export interface Order {
  id: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  student?: {
    id: string;
    email: string;
    displayName: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: {
      id: string;
      name: string;
      active: boolean;
    };
  }>;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: string;
}

interface ApiOrder {
  id: string;
  totalPrice: string | number;
  status: Order["status"];
  createdAt: string;
  student?: Order["student"];
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string | number;
    product: Order["items"][number]["product"];
  }>;
}

interface ApiProduct extends Omit<Product, "price"> {
  price: string | number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

async function apiRequest<T>(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new ApiError(errorMessage(body?.error), response.status);
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json()) as { data: T };
  return body.data;
}

function normalizeProduct(product: ApiProduct): Product {
  return { ...product, price: Number(product.price) };
}

function normalizeOrder(order: ApiOrder): Order {
  return {
    id: order.id,
    total: Number(order.totalPrice),
    status: order.status,
    createdAt: order.createdAt,
    student: order.student,
    items: order.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.unitPrice) * item.quantity,
    })),
  };
}

export const authApi = {
  microsoft: (idToken: string) =>
    apiRequest<AuthSession>("/api/auth/microsoft", undefined, {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
};

export const adminApi = {
  listUsers: (token: string) =>
    apiRequest<AdminUser[]>("/api/admin/users", token),

  updateUserRole: (token: string, userId: string, role: Role) =>
    apiRequest<AdminUser>(`/api/admin/users/${userId}/role`, token, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  createCategory: (token: string, name: string) =>
    apiRequest<Category>("/api/categories", token, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  updateCategory: (token: string, categoryId: string, name: string) =>
    apiRequest<Category>(`/api/categories/${categoryId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  deleteCategory: (token: string, categoryId: string) =>
    apiRequest<void>(`/api/categories/${categoryId}`, token, {
      method: "DELETE",
    }),
};

export const merchApi = {
  listCategories: () => apiRequest<Category[]>("/api/categories"),

  listProducts: async () =>
    (await apiRequest<ApiProduct[]>("/api/products")).map(normalizeProduct),

  generateDescription: (
    token: string,
    input: GenerateDescriptionInput,
  ) =>
    apiRequest<GenerateDescriptionResult>(
      "/api/products/generate-description",
      token,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

  createProduct: async (token: string, input: ProductInput) =>
    normalizeProduct(
      await apiRequest<ApiProduct>("/api/products", token, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),

  deactivateProduct: (token: string, id: string) =>
    apiRequest<void>(`/api/products/${id}`, token, {
      method: "DELETE",
    }),

  createOrder: async (
    token: string,
    items: Array<{ productId: string; quantity: number }>,
  ) =>
    normalizeOrder(
      await apiRequest<ApiOrder>("/api/orders", token, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    ),

  listOrders: async (token: string) =>
    (await apiRequest<ApiOrder[]>("/api/orders/mine", token)).map(
      normalizeOrder,
    ),

  listAllOrders: async (token: string) =>
    (await apiRequest<ApiOrder[]>("/api/orders", token)).map(normalizeOrder),

  updateOrderStatus: async (
    token: string,
    orderId: string,
    status: Exclude<OrderStatus, "PENDING">,
  ) =>
    normalizeOrder(
      await apiRequest<ApiOrder>(`/api/orders/${orderId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    ),
};
