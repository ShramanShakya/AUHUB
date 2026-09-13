import { ArrowLeft, ShieldCheck, Tags, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AdminUser, Category, Role } from "../api";

interface AdminConsoleProps {
  users: AdminUser[];
  categories: Category[];
  currentUserId: string | null;
  loading: boolean;
  busyAction: string | null;
  onBack: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (category: Category, name: string) => Promise<void>;
  onDeleteCategory: (category: Category) => Promise<void>;
  onChangeRole: (user: AdminUser, role: Role) => Promise<void>;
}

export function AdminConsole({
  users,
  categories,
  currentUserId,
  loading,
  busyAction,
  onBack,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onChangeRole,
}: AdminConsoleProps) {
  const [categoryName, setCategoryName] = useState("");

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    await onCreateCategory(name);
    setCategoryName("");
  }

  async function renameCategory(category: Category) {
    const name = window.prompt("Enter a new category name", category.name)?.trim();
    if (!name || name === category.name) return;
    await onRenameCategory(category, name);
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete the ${category.name} category?`)) return;
    await onDeleteCategory(category);
  }

  return (
    <main className="admin-console page-shell">
      <button className="text-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to collection
      </button>

      <header className="admin-console__header">
        <span className="overline">Admin console</span>
        <h1>Manage access and structure.</h1>
        <p>
          Admins control user roles and merchandise categories. Product and
          order operations remain available in the Staff studio.
        </p>
      </header>

      {loading ? (
        <div className="loading-card">Loading administration data…</div>
      ) : (
        <div className="admin-console__grid">
          <section className="management-panel">
            <div className="management-panel__heading">
              <Users />
              <div>
                <span className="overline">Access</span>
                <h2>User roles</h2>
              </div>
            </div>

            <div className="management-list">
              {users.map((managedUser) => {
                const isCurrentAdmin = managedUser.id === currentUserId;
                const action = `role-${managedUser.id}`;

                return (
                  <div className="management-row" key={managedUser.id}>
                    <div>
                      <strong>{managedUser.displayName ?? managedUser.email}</strong>
                      <span>{managedUser.email}</span>
                    </div>
                    <label>
                      <span className="sr-only">Role for {managedUser.email}</span>
                      <select
                        aria-label={`Role for ${managedUser.email}`}
                        disabled={isCurrentAdmin || busyAction === action}
                        value={managedUser.role}
                        onChange={(event) =>
                          void onChangeRole(managedUser, event.target.value as Role)
                        }
                      >
                        <option value="STUDENT">Student</option>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>

            <p className="management-hint">
              <ShieldCheck size={15} /> Your own admin role is protected from
              accidental removal.
            </p>
          </section>

          <section className="management-panel">
            <div className="management-panel__heading">
              <Tags />
              <div>
                <span className="overline">Catalog</span>
                <h2>Categories</h2>
              </div>
            </div>

            <form className="category-create" onSubmit={(event) => void createCategory(event)}>
              <input
                aria-label="New category name"
                maxLength={100}
                placeholder="New category"
                required
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
              />
              <button
                className="button button--small"
                disabled={busyAction === "create-category"}
                type="submit"
              >
                Add category
              </button>
            </form>

            <div className="management-list">
              {categories.map((category) => (
                <div className="management-row" key={category.id}>
                  <strong>{category.name}</strong>
                  <div className="management-actions">
                    <button
                      type="button"
                      disabled={busyAction === `category-${category.id}`}
                      onClick={() => void renameCategory(category)}
                    >
                      Rename
                    </button>
                    <button
                      className="danger-link"
                      type="button"
                      disabled={busyAction === `category-${category.id}`}
                      onClick={() => void deleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
