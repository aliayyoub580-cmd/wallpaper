import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api";
import AdminLayout from "./components/AdminLayout";

const iconChoices = ["📁", "🎨", "🌿", "🎮", "🏎️", "🌌", "🔥", "✨", "📌"];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function emptyForm() {
  return { id: null, name: "", slug: "", description: "", icon: "📁", parent_id: "" };
}

function AdminCategoriesPage({ adminSession, onAdminLogout }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm());

  const loadCategories = useCallback(async () => {
    try {
      const payload = await apiRequest("/api/admin/categories", {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      });
      setCategories(payload.categories || []);
    } catch (err) {
      setError(err.message);
    }
  }, [adminSession.token]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const parentCategories = useMemo(
    () => categories.filter((item) => item.parent_id == null && item.id !== form.id),
    [categories, form.id]
  );

  async function submitCategory(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      icon: form.icon,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
    };

    await apiRequest(form.id ? `/api/admin/categories/${form.id}` : "/api/admin/categories", {
      method: form.id ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${adminSession.token}` },
      body: JSON.stringify(payload),
    });

    setMessage(form.id ? "Category updated successfully." : "Category created successfully.");
    setForm(emptyForm());
    await loadCategories();
  }

  async function deleteCategory(id) {
    if (!window.confirm("Delete this category?")) return;

    await apiRequest(`/api/admin/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminSession.token}` },
    });
    setMessage("Category deleted successfully.");
    await loadCategories();
  }

  function editCategory(category) {
    setForm({
      id: category.id,
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      icon: category.icon || "📁",
      parent_id: category.parent_id || "",
    });
  }

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="Categories Management">
      {message ? <p className="wh-alert wh-alert-success">{message}</p> : null}
      {error ? <p className="wh-alert wh-alert-danger">{error}</p> : null}

      <div className="admin-card">
        <h3>{form.id ? "Edit Category" : "Create Category"}</h3>
        <form className="wh-admin-category-form" onSubmit={submitCategory}>
          <label>
            Category Name
            <input
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                setForm((prev) => ({ ...prev, name, slug: prev.id ? prev.slug : slugify(name) }));
              }}
              required
              maxLength={255}
            />
          </label>
          <label>
            Slug
            <input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} required />
          </label>
          <label>
            Parent Category
            <select value={form.parent_id} onChange={(event) => setForm((prev) => ({ ...prev, parent_id: event.target.value }))}>
              <option value="">No Parent</option>
              {parentCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="wh-admin-form-wide">
            Description
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <div className="wh-admin-form-wide">
            <span className="wh-admin-field-label">Icon</span>
            <div className="wh-icon-picker">
              {iconChoices.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  className={form.icon === icon ? "active" : ""}
                  onClick={() => setForm((prev) => ({ ...prev, icon }))}
                >
                  {icon}
                </button>
              ))}
              <input value={form.icon} onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))} maxLength={50} />
            </div>
          </div>
          <div className="wh-admin-form-actions">
            {form.id ? (
              <button type="button" className="wh-btn-secondary" onClick={() => setForm(emptyForm())}>Cancel Edit</button>
            ) : null}
            <button type="submit" className="wh-btn-primary">{form.id ? "Update Category" : "Create Category"}</button>
          </div>
        </form>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Slug</th><th>Parent</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {categories.map((row) => (
                <tr key={row.id}>
                  <td>{row.icon || "📁"} {row.name}</td>
                  <td>{row.slug}</td>
                  <td>{categories.find((category) => category.id === row.parent_id)?.name || "-"}</td>
                  <td>{row.description || "-"}</td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => editCategory(row)}>Edit</button>
                    <button type="button" className="danger" onClick={() => deleteCategory(row.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminCategoriesPage;
