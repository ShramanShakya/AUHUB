import { ArrowLeft, PackagePlus, WandSparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ProductInput } from "../api";
import { currencyCode, toMinorUnits } from "../format";

interface AdminPanelProps {
  saving: boolean;
  onBack: () => void;
  onCreate: (input: ProductInput) => Promise<void>;
}

const initialForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  department: "",
  price: "",
  stockQuantity: "",
};

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function AdminPanel({
  saving,
  onBack,
  onCreate,
}: AdminPanelProps) {
  const [form, setForm] = useState(initialForm);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      category: normalizeCode(form.category),
      department: normalizeCode(form.department),
      price: toMinorUnits(Number(form.price)),
      stockQuantity: Number(form.stockQuantity),
    });
    setForm(initialForm);
  }

  function field(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className="admin-page page-shell">
      <button className="text-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to collection
      </button>
      <div className="admin-layout">
        <section className="admin-intro">
          <span className="overline">Staff studio</span>
          <h1>Add the next campus favorite.</h1>
          <p>
            Start with the honest details. Gemini can help shape the polished
            description after the product is saved.
          </p>
          <div className="admin-note">
            <WandSparkles />
            <div>
              <strong>A small writing tip</strong>
              <span>
                Mention fit, material, or intended use only when you know it is
                accurate.
              </span>
            </div>
          </div>
        </section>

        <form className="product-form" onSubmit={(event) => void submit(event)}>
          <div className="form-heading">
            <PackagePlus />
            <div>
              <span className="overline">New item</span>
              <h2>Product details</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Product name
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => field("name", event.target.value)}
                placeholder="Computer Science Varsity Jacket"
              />
            </label>
            <label>
              SKU
              <input
                required
                maxLength={64}
                value={form.sku}
                onChange={(event) => field("sku", event.target.value)}
                placeholder="CS-JACKET-001"
              />
            </label>
            <label>
              Category
              <input
                required
                value={form.category}
                onChange={(event) => field("category", event.target.value)}
                placeholder="Jackets"
              />
            </label>
            <label>
              Department
              <input
                required
                value={form.department}
                onChange={(event) => field("department", event.target.value)}
                placeholder="Computer Science"
              />
            </label>
            <label>
              Price ({currencyCode})
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={form.price}
                onChange={(event) => field("price", event.target.value)}
                placeholder="45.00"
              />
            </label>
            <label>
              Opening stock
              <input
                required
                min="0"
                step="1"
                type="number"
                value={form.stockQuantity}
                onChange={(event) =>
                  field("stockQuantity", event.target.value)
                }
                placeholder="25"
              />
            </label>
            <label className="form-grid__wide">
              Plain description
              <textarea
                required
                maxLength={2000}
                rows={5}
                value={form.description}
                onChange={(event) => field("description", event.target.value)}
                placeholder="What should students know about this item?"
              />
            </label>
          </div>
          <button className="button button--wide" disabled={saving} type="submit">
            {saving ? "Saving product…" : "Add to collection"}
          </button>
        </form>
      </div>
    </main>
  );
}
