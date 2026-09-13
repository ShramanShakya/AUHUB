import {
  BookOpen,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  adminApi,
  merchApi,
  type AdminUser,
  type Category,
  type Product,
  type ProductInput,
  type Order,
  type OrderStatus,
  type Role,
} from "./api";
import { useAuth } from "./auth";
import { AdminConsole } from "./components/AdminConsole";
import { StaffPanel } from "./components/AdminPanel";
import { CartDrawer, type CartLine } from "./components/CartDrawer";
import { OrdersView } from "./components/OrdersView";
import { ProductCard } from "./components/ProductCard";
import { StaffOrdersView } from "./components/StaffOrdersView";

type View = "shop" | "orders" | "staff" | "staff-orders" | "admin";

export default function App() {
  const {
    account,
    user,
    isAdmin,
    canManageCatalog,
    signIn,
    signOut,
    getAccessToken,
  } = useAuth();
  const [view, setView] = useState<View>("shop");
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffOrders, setStaffOrders] = useState<Order[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [staffOrdersLoading, setStaffOrdersLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "good" | "bad";
    message: string;
  } | null>(null);
  const loadedAccountRef = useRef<string | null>(null);
  const blockedAccountRef = useRef<string | null>(null);

  const tell = useCallback((tone: "good" | "bad", message: string) => {
    setNotice({ tone, message });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const loadProducts = useCallback(async () => {
    if (!account) return;
    const accountId = account.homeAccountId;
    if (blockedAccountRef.current === accountId) return;
    setLoading(true);
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        merchApi.listProducts(),
        merchApi.listCategories(),
      ]);
      setProducts(nextProducts);
      setAvailableCategories(nextCategories);
      loadedAccountRef.current = accountId;
      blockedAccountRef.current = null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        blockedAccountRef.current = accountId;
        tell("bad", "Your Microsoft token was rejected. Sign out, sign in again, and verify the Entra app settings.");
      } else if (error instanceof TypeError) {
        blockedAccountRef.current = accountId;
        tell("bad", "The API is not reachable on localhost:3000. Start the backend and reload the page.");
      } else {
        tell("bad", error instanceof Error ? error.message : "Could not load products.");
      }
    } finally {
      setLoading(false);
    }
  }, [account, getAccessToken, tell]);

  useEffect(() => {
    if (!account?.homeAccountId) return;
    if (loadedAccountRef.current === account.homeAccountId) return;
    void loadProducts();
    // Reload only when the signed-in user changes, not on every auth callback identity.
  }, [account?.homeAccountId]);

  const categoryFilters = useMemo(
    () => ["ALL", ...new Set(products.map((product) => product.category.name))],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        (category === "ALL" || product.category.name === category) &&
        (!query ||
          product.name.toLowerCase().includes(query) ||
          (product.description ?? "").toLowerCase().includes(query) ||
          product.category.name.toLowerCase().includes(query)),
    );
  }, [category, products, search]);
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((item) => item.id === id);
          return product ? { product, quantity } : null;
        })
        .filter((line): line is CartLine => line !== null),
    [cart, products],
  );
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  async function enterOrders() {
    setView("orders");
    setMenuOpen(false);
    setOrdersLoading(true);
    try {
      const token = await getAccessToken();
      setOrders(await merchApi.listOrders(token));
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function enterAdmin() {
    setView("admin");
    setMenuOpen(false);
    setAdminLoading(true);
    try {
      const token = await getAccessToken();
      const [users, categories] = await Promise.all([
        adminApi.listUsers(token),
        merchApi.listCategories(),
      ]);
      setAdminUsers(users);
      setAvailableCategories(categories);
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Could not load admin data.");
    } finally {
      setAdminLoading(false);
    }
  }

  async function enterStaffOrders() {
    setView("staff-orders");
    setMenuOpen(false);
    setStaffOrdersLoading(true);
    try {
      const token = await getAccessToken();
      setStaffOrders(await merchApi.listAllOrders(token));
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Could not load customer orders.");
    } finally {
      setStaffOrdersLoading(false);
    }
  }

  function addToCart(product: Product) {
    setCart((current) => ({
      ...current,
      [product.id]: Math.min(
        (current[product.id] ?? 0) + 1,
        product.stock,
      ),
    }));
    setCartOpen(true);
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  }

  async function checkout() {
    if (cartLines.length === 0) return;
    setBusyAction("checkout");
    try {
      const token = await getAccessToken();
      await merchApi.createOrder(
        token,
        cartLines.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
      );
      setCart({});
      setCartOpen(false);
      tell("good", "Order placed. Your campus picks are officially yours.");
      await loadProducts();
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Order could not be placed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createProduct(input: ProductInput) {
    setBusyAction("create");
    try {
      const token = await getAccessToken();
      await merchApi.createProduct(token, input);
      tell("good", "Product added to the collection.");
      setView("shop");
      await loadProducts();
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Product could not be saved.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createCategory(name: string) {
    setBusyAction("create-category");
    try {
      const token = await getAccessToken();
      const created = await adminApi.createCategory(token, name);
      setAvailableCategories((current) =>
        [...current, created].sort((left, right) => left.name.localeCompare(right.name)),
      );
      tell("good", "Category created.");
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Category could not be created.");
    } finally {
      setBusyAction(null);
    }
  }

  async function renameCategory(categoryToRename: Category, name: string) {
    setBusyAction(`category-${categoryToRename.id}`);
    try {
      const token = await getAccessToken();
      const updated = await adminApi.updateCategory(token, categoryToRename.id, name);
      setAvailableCategories((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setProducts((current) =>
        current.map((product) =>
          product.category.id === updated.id
            ? { ...product, category: updated }
            : product,
        ),
      );
      tell("good", "Category renamed.");
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Category could not be renamed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteCategory(categoryToDelete: Category) {
    setBusyAction(`category-${categoryToDelete.id}`);
    try {
      const token = await getAccessToken();
      await adminApi.deleteCategory(token, categoryToDelete.id);
      setAvailableCategories((current) =>
        current.filter((item) => item.id !== categoryToDelete.id),
      );
      tell("good", "Category deleted.");
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Category could not be deleted.");
    } finally {
      setBusyAction(null);
    }
  }

  async function changeUserRole(managedUser: AdminUser, role: Role) {
    setBusyAction(`role-${managedUser.id}`);
    try {
      const token = await getAccessToken();
      const updated = await adminApi.updateUserRole(token, managedUser.id, role);
      setAdminUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      tell("good", `${updated.displayName ?? updated.email} is now ${role.toLowerCase()}.`);
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "The user role could not be updated.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateOrderStatus(
    order: Order,
    status: Exclude<OrderStatus, "PENDING">,
  ) {
    setBusyAction(`order-${order.id}`);
    try {
      const token = await getAccessToken();
      const updated = await merchApi.updateOrderStatus(token, order.id, status);
      setStaffOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      tell("good", `Order ${order.id.slice(0, 8).toUpperCase()} is now ${status.toLowerCase()}.`);
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "The order status could not be updated.");
    } finally {
      setBusyAction(null);
    }
  }

  async function generateDescription(
    name: string,
    category: string,
  ): Promise<string | null> {
    setBusyAction("generate-description");
    try {
      const token = await getAccessToken();
      const result = await merchApi.generateDescription(token, {
        name,
        category,
      });
      tell("good", "Gemini generated a description. Review it before saving.");
      return result.description;
    } catch (error) {
      tell(
        "bad",
        error instanceof Error
          ? error.message
          : "The description could not be generated.",
      );
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function deactivateProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from the storefront?`)) return;
    setBusyAction(`delete-${product.id}`);
    try {
      const token = await getAccessToken();
      await merchApi.deactivateProduct(token, product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      tell("good", "Product removed from the storefront.");
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Product could not be removed.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!account) {
    return (
      <div className="landing">
        <header className="landing-nav page-shell">
          <Brand />
          <button
            className="button button--light"
            type="button"
            onClick={() =>
              void signIn().catch((error: unknown) =>
                tell(
                  "bad",
                  error instanceof Error ? error.message : "Sign-in failed.",
                ),
              )
            }
          >
            <LogIn size={17} /> University sign in
          </button>
        </header>
        <main className="landing-hero page-shell">
          <div className="landing-copy">
            <span className="hand-note">Made for lecture halls & late nights</span>
            <p className="overline">The official campus collection</p>
            <h1>Wear the place that shaped you.</h1>
            <p className="landing-lead">
              Thoughtful university goods for class, club days, and everywhere
              your next chapter takes you.
            </p>
            <button
              className="button button--coral"
              type="button"
              onClick={() => void signIn().catch((error: unknown) =>
                tell("bad", error instanceof Error ? error.message : "Sign-in failed."),
              )}
            >
              Explore the collection <span aria-hidden="true">→</span>
            </button>
            <div className="trust-row">
              <span><ShieldCheck size={17} /> University-only access</span>
              <span><Package size={17} /> Live campus stock</span>
            </div>
          </div>
          <div className="hero-collage" aria-label="Campus collection preview">
            <div className="collage-card collage-card--one">
              <span>CS</span><strong>Varsity season</strong>
            </div>
            <div className="collage-card collage-card--two">
              <BookOpen size={54} /><strong>Study essentials</strong>
            </div>
            <div className="collage-seal">
              <Sparkles size={20} /> Campus<br />Supply
            </div>
          </div>
        </main>
        <footer className="landing-footer page-shell">
          <span>University Merch Store</span>
          <span>Securely signed in with Microsoft</span>
        </footer>
        <Notice notice={notice} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="page-shell header-inner">
          <button className="brand-button" type="button" onClick={() => setView("shop")}>
            <Brand />
          </button>
          <nav className={menuOpen ? "is-open" : ""}>
            <button type="button" onClick={() => { setView("shop"); setMenuOpen(false); }}>
              Collection
            </button>
            {!canManageCatalog && (
              <button type="button" onClick={() => void enterOrders()}>
                My orders
              </button>
            )}
            {canManageCatalog && (
              <button type="button" onClick={() => { setView("staff"); setMenuOpen(false); }}>
                Staff studio
              </button>
            )}
            {canManageCatalog && (
              <button type="button" onClick={() => void enterStaffOrders()}>
                Order desk
              </button>
            )}
            {isAdmin && (
              <button type="button" onClick={() => void enterAdmin()}>
                Admin console
              </button>
            )}
          </nav>
          <div className="header-actions">
            <span className="user-chip">
              {account.name?.split(" ")[0] ?? "Student"}
              {user && <small>{user.role}</small>}
            </span>
            {!canManageCatalog && (
              <button className="bag-button" type="button" onClick={() => setCartOpen(true)}>
                <ShoppingBag size={20} />
                <span className="sr-only">Open cart</span>
                {cartCount > 0 && <b>{cartCount}</b>}
              </button>
            )}
            <button className="icon-button desktop-only" type="button" onClick={() => void signOut()}>
              <LogOut size={19} /><span className="sr-only">Sign out</span>
            </button>
            <button className="icon-button menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X /> : <Menu />}
              <span className="sr-only">Toggle menu</span>
            </button>
          </div>
        </div>
      </header>

      {view === "orders" && (
        <OrdersView orders={orders} loading={ordersLoading} onBack={() => setView("shop")} />
      )}
      {view === "staff" && canManageCatalog && (
        <StaffPanel
          categories={availableCategories}
          generating={busyAction === "generate-description"}
          saving={busyAction === "create"}
          onBack={() => setView("shop")}
          onCreate={createProduct}
          onGenerateDescription={generateDescription}
        />
      )}
      {view === "staff-orders" && canManageCatalog && (
        <StaffOrdersView
          orders={staffOrders}
          loading={staffOrdersLoading}
          busyAction={busyAction}
          onBack={() => setView("shop")}
          onUpdateStatus={updateOrderStatus}
        />
      )}
      {view === "admin" && isAdmin && (
        <AdminConsole
          users={adminUsers}
          categories={availableCategories}
          currentUserId={user?.id ?? null}
          loading={adminLoading}
          busyAction={busyAction}
          onBack={() => setView("shop")}
          onCreateCategory={createCategory}
          onRenameCategory={renameCategory}
          onDeleteCategory={deleteCategory}
          onChangeRole={changeUserRole}
        />
      )}
      {view === "shop" && (
        <main>
          <section className="shop-hero">
            <div className="page-shell">
              <p className="overline">Fall campus collection</p>
              <h1>Good things for busy minds.</h1>
              <p>Official pieces, practical favorites, and a little university pride.</p>
            </div>
          </section>
          <section className="catalog page-shell">
            <div className="catalog-tools">
              <div className="category-tabs" aria-label="Product categories">
                {categoryFilters.map((item) => (
                  <button
                    className={category === item ? "is-active" : ""}
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                  >
                    {item === "ALL" ? "Everything" : item.toLowerCase().replaceAll("_", " ")}
                  </button>
                ))}
              </div>
              <label className="search-box">
                <Search size={18} />
                <span className="sr-only">Search products</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search the collection"
                />
              </label>
            </div>

            {loading ? (
              <div className="product-grid">
                {[1, 2, 3].map((item) => <div className="product-skeleton" key={item} />)}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="empty-state empty-state--page">
                <Search size={38} strokeWidth={1.5} />
                <h2>Nothing matches that search.</h2>
                <p>Try another word or browse the whole collection.</p>
              </div>
            ) : (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    canManageCatalog={canManageCatalog}
                    busyAction={busyAction}
                    onAdd={addToCart}
                    onDeactivate={(item) => void deactivateProduct(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {!canManageCatalog && (
        <CartDrawer
          open={cartOpen}
          lines={cartLines}
          submitting={busyAction === "checkout"}
          onClose={() => setCartOpen(false)}
          onQuantity={changeQuantity}
          onCheckout={() => void checkout()}
        />
      )}
      <Notice notice={notice} />
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span>AU</span>
      <div><strong>AU</strong><small>HUB</small></div>
    </div>
  );
}

function Notice({ notice }: { notice: { tone: "good" | "bad"; message: string } | null }) {
  if (!notice) return null;
  return <div className={`notice notice--${notice.tone}`}>{notice.message}</div>;
}
