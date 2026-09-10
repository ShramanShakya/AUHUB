import { ArrowLeft, PackageCheck, ReceiptText } from "lucide-react";
import type { Order } from "../api";
import { formatMoney } from "../format";

interface OrdersViewProps {
  orders: Order[];
  loading: boolean;
  onBack: () => void;
}

export function OrdersView({ orders, loading, onBack }: OrdersViewProps) {
  return (
    <main className="orders-page page-shell">
      <button className="text-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to collection
      </button>
      <header className="orders-header">
        <span className="overline">Order journal</span>
        <h1>Your campus finds.</h1>
        <p>Every order and its purchase-time price, all in one place.</p>
      </header>

      {loading ? (
        <div className="loading-card">Gathering your orders…</div>
      ) : orders.length === 0 ? (
        <div className="empty-state empty-state--page">
          <ReceiptText size={42} strokeWidth={1.5} />
          <h2>No orders just yet.</h2>
          <p>Your first campus find will show up here.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card__header">
                <div>
                  <span>
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(order.createdAt))}
                  </span>
                  <strong>Order {order.id.slice(0, 8).toUpperCase()}</strong>
                </div>
                <span className="status-pill">
                  <PackageCheck size={15} /> {order.status.toLowerCase()}
                </span>
              </div>
              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item.id}>
                    <span>
                      {item.quantity} × {item.product.name}
                    </span>
                    <strong>{formatMoney(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="order-card__total">
                <span>Total</span>
                <strong>{formatMoney(order.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
