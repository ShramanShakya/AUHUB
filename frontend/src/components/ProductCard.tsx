import { PackageX, Plus, Trash2 } from "lucide-react";
import type { Product } from "../api";
import { formatMoney, titleCase } from "../format";

interface ProductCardProps {
  product: Product;
  canManageCatalog: boolean;
  busyAction: string | null;
  onAdd: (product: Product) => void;
  onDeactivate: (product: Product) => void;
}

export function ProductCard({
  product,
  canManageCatalog,
  busyAction,
  onAdd,
  onDeactivate,
}: ProductCardProps) {
  const soldOut = product.stock === 0;
  const initials = product.category.name.slice(0, 2).toUpperCase();

  return (
    <article className="product-card">
      <div className={`product-art art-${product.category.name.length % 4}`}>
        <span className="product-art__department">
          {titleCase(product.category.name)}
        </span>
        <strong aria-hidden="true">{initials}</strong>
        <span className="product-art__stamp">Campus edition</span>
      </div>
      <div className="product-card__body">
        <div className="product-card__eyebrow">
          <span>{titleCase(product.category.name)}</span>
          <span>{product.stock} left</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description ?? "Official university merchandise."}</p>
        <div className="product-card__footer">
          <strong>{formatMoney(product.price)}</strong>
          <button
            className="button button--small"
            type="button"
            disabled={soldOut}
            onClick={() => onAdd(product)}
          >
            {soldOut ? <PackageX size={16} /> : <Plus size={16} />}
            {soldOut ? "Sold out" : "Add"}
          </button>
        </div>
        {canManageCatalog && (
          <div className="staff-actions" aria-label="Staff product actions">
            <button
              className="danger-link"
              type="button"
              disabled={busyAction === `delete-${product.id}`}
              onClick={() => onDeactivate(product)}
            >
              <Trash2 size={15} />
              Remove
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
