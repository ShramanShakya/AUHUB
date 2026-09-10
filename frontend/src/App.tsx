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
  merchApi,
  type Product,
  type ProductInput,
  type Order,
} from "./api";
import { useAuth } from "./auth";
import { AdminPanel } from "./components/AdminPanel";
import { CartDrawer, type CartLine } from "./components/CartDrawer";
import { OrdersView } from "./components/OrdersView";
import { ProductCard } from "./components/ProductCard";

type View = "shop" | "orders" | "admin";

export default function App() {
  const { account, isStaff, signIn, signOut, getAccessToken } = useAuth();
  const [view, setView] = useState<View>("shop");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
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
      const token = await getAccessToken();
      setProducts(await merchApi.listProducts(token));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.homeAccountId]);

  const categories = useMemo(
    () => ["ALL", ...new Set(products.map((product) => product.category))],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(
      (product) =>
        (category === "ALL" || product.category === category) &&
        (!query ||
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.department.toLowerCase().includes(query)),
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

  function addToCart(product: Product) {
    setCart((current) => ({
      ...current,
      [product.id]: Math.min(
        (current[product.id] ?? 0) + 1,
        product.stockQuantity,
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

  async function generateDescription(product: Product) {
    setBusyAction(`generate-${product.id}`);
    try {
      const token = await getAccessToken();
      const updated = await merchApi.generateDescription(token, product.id);
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      tell("good", `A fresh description is ready for ${product.name}.`);
    } catch (error) {
      tell("bad", error instanceof Error ? error.message : "Description could not be generated.");
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
            {!isStaff && (
              <button type="button" onClick={() => void enterOrders()}>
                My orders
              </button>
            )}
            {isStaff && (
              <button type="button" onClick={() => { setView("admin"); setMenuOpen(false); }}>
                Staff studio
              </button>
            )}
          </nav>
          <div className="header-actions">
            <span className="user-chip">
              {account.name?.split(" ")[0] ?? "Student"}
              {isStaff && <small>Staff</small>}
            </span>
            {!isStaff && (
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
      {view === "admin" && isStaff && (
        <AdminPanel
          saving={busyAction === "create"}
          onBack={() => setView("shop")}
          onCreate={createProduct}
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
                {categories.map((item) => (
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
                    isStaff={isStaff}
                    busyAction={busyAction}
                    onAdd={addToCart}
                    onGenerate={(item) => void generateDescription(item)}
                    onDeactivate={(item) => void deactivateProduct(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {!isStaff && (
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
