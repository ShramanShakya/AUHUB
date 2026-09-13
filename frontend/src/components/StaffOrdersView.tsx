import { ArrowLeft, CheckCircle2, PackageCheck, ReceiptText, XCircle } from "lucide-react";
import type { Order, OrderStatus } from "../api";
import { formatMoney } from "../format";

interface StaffOrdersViewProps {
  orders: Order[];
  loading: boolean;
  busyAction: string | null;
  onBack: () => void;
  onUpdateStatus: (
    order: Order,
    status: Exclude<OrderStatus, "PENDING">,
  ) => Promise<void>;
}

function availableActions(status: OrderStatus) {
  if (status === "PENDING") return ["CONFIRMED", "CANCELLED"] as const;
  if (status === "CONFIRMED") return ["COMPLETED", "CANCELLED"] as const;
  return [] as const;
}

export function StaffOrdersView({
  orders,
  loading,
  busyAction,
  onBack,
  onUpdateStatus,
}: StaffOrdersViewProps) {
  return (
    <main className="orders-page page-shell">
      <button className="text-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to collection
      </button>
      <header className="orders-header">
        <span className="overline">Staff order desk</span>
        <h1>Keep every order moving.</h1>
        <p>Confirm new orders, complete fulfilled orders, or cancel them when needed.</p>
      </header>

      {loading ? (
        <div className="loading-card">Loading customer orders…</div>
      ) : orders.length === 0 ? (
        <div className="empty-state empty-state--page">
          <ReceiptText size={42} strokeWidth={1.5} />
          <h2>No customer orders yet.</h2>
          <p>New campus orders will appear here.</p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const actions = availableActions(order.status);
            const busy = busyAction === `order-${order.id}`;

            return (
              <article className="order-card" key={order.id}>
                <div className="order-card__header">
                  <div>
                    <span>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(order.createdAt))}
                    </span>
                    <strong>Order {order.id.slice(0, 8).toUpperCase()}</strong>
                    {order.student && (
                      <span>{order.student.displayName ?? order.student.email}</span>
                    )}
                  </div>
                  <span className="status-pill">
                    <PackageCheck size={15} /> {order.status.toLowerCase()}
                  </span>
                </div>
                <div className="order-items">
                  {order.items.map((item) => (
                    <div key={item.id}>
                      <span>{item.quantity} × {item.product.name}</span>
                      <strong>{formatMoney(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="order-card__total">
                  <span>Total</span>
                  <strong>{formatMoney(order.total)}</strong>
                </div>
                {actions.length > 0 && (
                  <div className="order-actions">
                    {actions.map((status) => (
                      <button
                        className={status === "CANCELLED" ? "button button--danger" : "button button--small"}
                        disabled={busy}
                        key={status}
                        type="button"
                        onClick={() => void onUpdateStatus(order, status)}
                      >
                        {status === "CANCELLED" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        {status === "CONFIRMED" ? "Confirm order" : status === "COMPLETED" ? "Complete order" : "Cancel order"}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
