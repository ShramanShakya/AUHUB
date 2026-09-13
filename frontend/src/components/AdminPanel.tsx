import { ArrowLeft, PackagePlus, WandSparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Category, ProductInput } from "../api";
import { currencyCode, toMinorUnits } from "../format";

interface StaffPanelProps {
  saving: boolean;
  generating: boolean;
  categories: Category[];
  onBack: () => void;
  onCreate: (input: ProductInput) => Promise<void>;
  onGenerateDescription: (
    name: string,
    category: string,
  ) => Promise<string | null>;
}

const initialForm = {
  name: "",
  description: "",
  categoryId: "",
  price: "",
  stock: "",
};

export function StaffPanel({
  saving,
  generating,
  categories,
  onBack,
  onCreate,
  onGenerateDescription,
}: StaffPanelProps) {
  const [form, setForm] = useState(initialForm);

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      name: form.name.trim(),
      description: form.description.trim(),
      price: toMinorUnits(Number(form.price)),
      stock: Number(form.stock),
      categoryId: form.categoryId,
    });
    setForm(initialForm);
  }

  function field(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function generateDescription() {
    if (!form.name.trim() || !selectedCategory) return;

    const description = await onGenerateDescription(
      form.name.trim(),
      selectedCategory.name,
    );

    if (description) field("description", description);
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
            description after you enter a product name and category.
          </p>
          <div className="admin-note">
            <div>
              <strong>A small writing tip</strong>
              <span>Mention fit, material, or intended use only when it is accurate.</span>
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
              Category
              <select
                required
                value={form.categoryId}
                onChange={(event) => field("categoryId", event.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
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
                value={form.stock}
                onChange={(event) =>
                  field("stock", event.target.value)
                }
                placeholder="25"
              />
            </label>
            <div className="description-actions form-grid__wide">
              <span>Product description</span>
              <button
                className="button button--small"
                disabled={
                  saving ||
                  generating ||
                  !form.name.trim() ||
                  !selectedCategory
                }
                type="button"
                onClick={() => void generateDescription()}
              >
                <WandSparkles size={16} />
                {generating ? "Generating…" : "Generate with AI"}
              </button>
            </div>
            <label className="form-grid__wide">
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
