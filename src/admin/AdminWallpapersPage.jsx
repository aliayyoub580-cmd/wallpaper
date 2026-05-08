import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { apiRequest } from "../api";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";
import AdminLayout from "./components/AdminLayout";

function AdminWallpapersPage({ adminSession, onAdminLogout }) {
  const [wallpapers, setWallpapers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editing, setEditing] = useState(null);
  const [bulkMode, setBulkMode] = useState("");
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [bulkCategoryIds, setBulkCategoryIds] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [wallpaperPayload, categoryPayload, metadata] = await Promise.all([
        apiRequest("/api/admin/wallpapers", {
          headers: { Authorization: `Bearer ${adminSession.token}` },
        }),
        apiRequest("/api/admin/categories", {
          headers: { Authorization: `Bearer ${adminSession.token}` },
        }),
        loadGitHubWallpaperMetadata().catch(() => null),
      ]);

      setWallpapers(metadata ? mergeWallpaperMetadata(wallpaperPayload.wallpapers || [], metadata) : (wallpaperPayload.wallpapers || []));
      setCategories(categoryPayload.categories || []);
    } catch (err) {
      setError(err.message);
    }
  }, [adminSession.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const parentCategories = useMemo(
    () => categories.filter((category) => category.parent_id == null),
    [categories]
  );

  function openEdit(wallpaper) {
    setEditing(wallpaper);
    setEditForm({
      name: wallpaper.name || wallpaper.title || "",
      description: wallpaper.description || "",
    });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing) return;

    await apiRequest(`/api/admin/wallpapers/${editing.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminSession.token}` },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    setMessage("Wallpaper updated successfully.");
    await loadData();
  }

  async function deleteWallpaper(id) {
    if (!window.confirm("Delete this wallpaper? This action cannot be undone.")) return;

    await apiRequest(`/api/admin/wallpapers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminSession.token}` },
    });
    setMessage("Wallpaper deleted successfully.");
    await loadData();
  }

  function toggleSelection(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) {
      setError("Select at least one wallpaper first.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected wallpaper(s)?`)) return;

    await apiRequest("/api/admin/wallpapers/bulk-delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminSession.token}` },
      body: JSON.stringify({ wallpaper_ids: selectedIds.join(",") }),
    });
    setSelectedIds([]);
    setMessage("Selected wallpapers deleted successfully.");
    await loadData();
  }

  async function bulkUpdateCategories(event) {
    event.preventDefault();

    if (selectedIds.length === 0 || bulkCategoryIds.length === 0) {
      setError("Select wallpapers and at least one category.");
      return;
    }

    await apiRequest("/api/admin/wallpapers/bulk-update", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminSession.token}` },
      body: JSON.stringify({ wallpaper_ids: selectedIds.join(","), categories: bulkCategoryIds }),
    });
    setBulkMode("");
    setBulkCategoryIds([]);
    setSelectedIds([]);
    setMessage("Selected wallpapers updated successfully.");
    await loadData();
  }

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="Wallpapers Management">
      {message ? <p className="wh-alert wh-alert-success">{message}</p> : null}
      {error ? <p className="wh-alert wh-alert-danger">{error}</p> : null}

      <div className="admin-card wh-admin-toolbar">
        <div>
          <h3>All Wallpapers</h3>
          <p>{wallpapers.length} wallpapers in the library</p>
        </div>
        <div className="wh-admin-toolbar-actions">
          <Link to="/admin/bulk-upload" className="admin-gold-btn">
            <i className="fas fa-cloud-upload-alt" /> Bulk Upload
          </Link>
          <button type="button" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
            Cancel Selection
          </button>
          <button type="button" className="danger" onClick={bulkDelete} disabled={selectedIds.length === 0}>
            <i className="fas fa-trash-alt" /> Delete Selected
          </button>
          <button type="button" onClick={() => setBulkMode("categories")} disabled={selectedIds.length === 0}>
            <i className="fas fa-tags" /> Edit Categories
          </button>
        </div>
      </div>

      <div className="wh-admin-wallpaper-grid">
        {wallpapers.map((wallpaper, index) => {
          const filename = wallpaper.filename || wallpaper.name || wallpaper.id;
          const selected = selectedIds.includes(wallpaper.id);

          return (
            <article key={wallpaper.id} className={`wh-admin-wallpaper-card ${selected ? "selected" : ""}`}>
              <label className="wh-admin-select">
                <input type="checkbox" checked={selected} onChange={() => toggleSelection(wallpaper.id)} />
              </label>
              <div className="wh-admin-wallpaper-media">
                <WallpaperArtwork
                  wallpaper={wallpaper}
                  alt={wallpaper.name}
                  priority={selectedIds.length === 0 && index < 4}
                  className="wh-admin-wallpaper-media-shell"
                  mediaClassName="wh-admin-wallpaper-image"
                  autoPlayVideo={false}
                  loopVideo={false}
                  mutedVideo
                />
                <div className="wh-admin-card-overlay">
                  <Link to={`/wallpaper/${encodeURIComponent(filename)}`} target="_blank" className="overlay-btn">
                    <i className="fas fa-eye" /> View
                  </Link>
                  <button type="button" className="overlay-btn success" onClick={() => openEdit(wallpaper)}>
                    <i className="fas fa-edit" /> Edit
                  </button>
                  <button type="button" className="overlay-btn danger" onClick={() => deleteWallpaper(wallpaper.id)}>
                    <i className="fas fa-trash" /> Delete
                  </button>
                </div>
              </div>
              <div className="wh-admin-wallpaper-info">
                <h4 title={wallpaper.name}>{wallpaper.name}</h4>
                <div className="wh-admin-meta">
                  <span><i className="fas fa-eye" /> {(wallpaper.views || 0).toLocaleString()}</span>
                  <span><i className="fas fa-heart" /> {(wallpaper.likes_count || 0).toLocaleString()}</span>
                  <span><i className="fas fa-download" /> {(wallpaper.downloads || 0).toLocaleString()}</span>
                </div>
                <div className="wh-admin-tags">
                  {(wallpaper.categories || []).slice(0, 3).map((category) => (
                    <span key={category.id || category.name}>{category.name}</span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {editing ? (
        <div className="wh-modal-backdrop" role="dialog" aria-modal="true">
          <form className="wh-admin-modal" onSubmit={saveEdit}>
            <h2>Edit Wallpaper</h2>
            <label>
              Name
              <input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
            <label>
              Description
              <textarea rows={4} value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <div className="wh-modal-actions">
              <button type="button" className="wh-btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="wh-btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      ) : null}

      {bulkMode === "categories" ? (
        <div className="wh-modal-backdrop" role="dialog" aria-modal="true">
          <form className="wh-admin-modal" onSubmit={bulkUpdateCategories}>
            <h2>Edit Categories</h2>
            <p>Select which categories apply to the selected wallpapers.</p>
            <div className="wh-admin-category-picker">
              {parentCategories.map((category) => {
                const children = categories.filter((item) => item.parent_id === category.id);
                return (
                  <div key={category.id} className="wh-admin-category-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={bulkCategoryIds.includes(category.id)}
                        onChange={(event) => {
                          setBulkCategoryIds((prev) =>
                            event.target.checked
                              ? [...prev.filter((id) => !children.some((child) => child.id === id)), category.id]
                              : prev.filter((id) => id !== category.id)
                          );
                        }}
                      />
                      {category.icon || <i className="fas fa-folder" />} {category.name}
                    </label>
                    {children.length > 0 ? (
                      <div className="wh-admin-category-children">
                        {children.map((child) => (
                          <label key={child.id}>
                            <input
                              type="checkbox"
                              checked={bulkCategoryIds.includes(child.id)}
                              onChange={(event) => {
                                setBulkCategoryIds((prev) =>
                                  event.target.checked
                                    ? [...prev.filter((id) => id !== category.id && !children.some((item) => item.id === id)), child.id]
                                    : prev.filter((id) => id !== child.id)
                                );
                              }}
                            />
                            {child.icon || <i className="fas fa-tag" />} {child.name}
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="wh-modal-actions">
              <button type="button" className="wh-btn-secondary" onClick={() => setBulkMode("")}>Cancel</button>
              <button type="submit" className="wh-btn-primary">Apply Categories</button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminLayout>
  );
}

export default AdminWallpapersPage;
