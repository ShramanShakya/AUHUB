import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { Product } from "../api";
import { formatMoney } from "../format";

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  lines: CartLine[];
  submitting: boolean;
  onClose: () => void;
  onQuantity: (productId: string, quantity: number) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  lines,
  submitting,
  onClose,
  onQuantity,
  onCheckout,
}: CartDrawerProps) {
  const total = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );

  return (
    <>
      <button
        className={`drawer-backdrop ${open ? "is-open" : ""}`}
        aria-label="Close cart"
        type="button"
        onClick={onClose}
      />
      <aside
        className={`cart-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-label="Shopping bag"
      >
        <div className="cart-drawer__header">
          <div>
            <span className="overline">Your picks</span>
            <h2>Campus bag</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            <X />
            <span className="sr-only">Close cart</span>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={38} strokeWidth={1.5} />
            <h3>Your bag is taking a study break.</h3>
            <p>Add something from the collection to wake it up.</p>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {lines.map(({ product, quantity }) => (
                <div className="cart-line" key={product.id}>
                  <div className="cart-line__art">
                    {product.category.name.slice(0, 2)}
                  </div>
                  <div className="cart-line__details">
                    <strong>{product.name}</strong>
                    <span>{formatMoney(product.price)}</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => onQuantity(product.id, quantity - 1)}
                        aria-label={`Remove one ${product.name}`}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        disabled={quantity >= product.stock}
                        onClick={() => onQuantity(product.id, quantity + 1)}
                        aria-label={`Add one ${product.name}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div>
                <span>Order total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              <p>Prices are confirmed by the university store at checkout.</p>
              <button
                className="button button--wide"
                type="button"
                disabled={submitting}
                onClick={onCheckout}
              >
                {submitting ? "Placing order…" : "Place order"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
