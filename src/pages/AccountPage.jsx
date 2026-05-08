import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { apiRequest } from "../api";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";

function AccountPage({ session, onLogout }) {
  const [payload, setPayload] = useState({ wallpapers: [], user: null });
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (!session.token) return;
    Promise.all([
      apiRequest("/api/users/me/account", {
        headers: { Authorization: `Bearer ${session.token}` },
      }),
      loadGitHubWallpaperMetadata().catch(() => null),
    ])
      .then(([data, metadata]) => {
        const wallpapers = metadata ? mergeWallpaperMetadata(data.wallpapers || [], metadata) : (data.wallpapers || []);
        setPayload({ ...data, wallpapers });
      })
      .catch(() => setPayload({ wallpapers: [], user: null }));
  }, [session.token]);

  async function deleteWallpaper(id) {
    if (!session.token) return;
    await apiRequest(`/api/users/my-wallpapers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const refreshed = await apiRequest("/api/users/me/account", {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    const metadata = await loadGitHubWallpaperMetadata().catch(() => null);
    setPayload({
      ...refreshed,
      wallpapers: metadata ? mergeWallpaperMetadata(refreshed.wallpapers || [], metadata) : (refreshed.wallpapers || []),
    });
  }

  const userName = payload.user?.name || session.user?.name || session.user?.email || "My Account";
  const userInitial = userName.slice(0, 1).toUpperCase();

  const joinedLabel = useMemo(() => {
    const raw = payload.user?.created_at || session.user?.created_at;
    if (!raw) return "Member";

    const created = new Date(raw);
    if (Number.isNaN(created.getTime())) return "Member";

    return `Joined ${created.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  }, [payload.user?.created_at, session.user?.created_at]);

  const stats = {
    wallpapers: payload.wallpapers?.length || 0,
    views: payload.totalViews || 0,
    downloads: payload.totalDownloads || 0,
    likes: payload.totalLikes || 0,
  };

  const deleteTarget = (payload.wallpapers || []).find((item) => item.id === deleteTargetId) || null;

  async function confirmDelete() {
    if (!deleteTargetId) return;
    await deleteWallpaper(deleteTargetId);
    setDeleteTargetId(null);
  }

  return (
    <div className="wh-account-page">
      <nav className="wh-account-navbar">
        <div className="wh-account-nav-inner">
          <Link to="/" className="wh-account-brand">
            <img src="/images/logo.png" alt="WallHub" />
          </Link>

          <div className="wh-account-nav-links">
            <Link to="/" className="wh-account-nav-link"><i className="fas fa-home" /> Home</Link>
            <Link to="/upload" className="wh-account-nav-link"><i className="fas fa-cloud-upload-alt" /> Upload</Link>
            <Link to="/my-account" className="wh-account-nav-link active"><i className="fas fa-user" /> My Account</Link>
            <button type="button" className="wh-account-nav-link wh-account-logout" onClick={onLogout}>
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <section className="wh-profile-cover" style={{ backgroundImage: "url('/images/Hero.jpg')" }}>
        <div className="wh-profile-overlay" />
        <button type="button" className="wh-edit-profile-btn" title="Profile editing coming soon">
          <i className="fas fa-pen" /> EDIT PROFILE
        </button>

        <div className="wh-profile-info">
          <div className="wh-profile-avatar">{userInitial}</div>
          <h2>{userName}</h2>
          <span className="wh-joined-badge">{joinedLabel}</span>
        </div>
      </section>

      <section className="wh-stats-bar">
        <article className="wh-stat"><i className="fas fa-images" /><h4>{stats.wallpapers}</h4><span>Wallpapers</span></article>
        <article className="wh-stat"><i className="fas fa-eye" /><h4>{stats.views.toLocaleString()}</h4><span>Views</span></article>
        <article className="wh-stat"><i className="fas fa-download" /><h4>{stats.downloads.toLocaleString()}</h4><span>Downloads</span></article>
        <article className="wh-stat"><i className="fas fa-heart" /><h4>{stats.likes.toLocaleString()}</h4><span>Favs</span></article>
      </section>

      <main className="wh-wallpapers-section">
        <div className="wh-wallpapers-grid">
          <Link to="/upload" className="wh-account-upload-card">
            <span>+</span>
            <p>UPLOAD</p>
          </Link>

          {(payload.wallpapers || []).map((wallpaper) => (
            <article key={wallpaper.id} className="wh-account-wallpaper-card">
              <div className="wh-wallpaper-menu">
                <button type="button" className="wh-menu-btn wh-delete-btn" onClick={() => setDeleteTargetId(wallpaper.id)}>
                  <i className="fas fa-trash" />
                </button>
              </div>

              <WallpaperArtwork
                wallpaper={wallpaper}
                alt={wallpaper.name}
                priority={false}
                className="wh-account-wallpaper-media-shell"
                mediaClassName="wh-account-wallpaper-media"
                autoPlayVideo={false}
                loopVideo={false}
                mutedVideo
              />

              <div className="wh-wallpaper-info">
                <div className="wh-wallpaper-name" title={wallpaper.name}>{wallpaper.name}</div>
                <div className="wh-wallpaper-categories">
                  {(wallpaper.categories || []).slice(0, 3).map((category) => (
                    <span key={category.id || category.slug || category.name} className="wh-category-tag">{category.name}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {(payload.wallpapers || []).length === 0 ? (
          <div className="wh-no-wallpapers">
            <i className="fas fa-images" />
            <p>You have not uploaded any wallpapers yet.</p>
            <Link to="/upload">Upload your first wallpaper</Link>
          </div>
        ) : null}
      </main>

      {deleteTarget ? (
        <div className="wh-delete-modal-backdrop" role="dialog" aria-modal="true">
          <div className="wh-delete-modal">
            <h5><i className="fas fa-exclamation-triangle" /> Delete Wallpaper</h5>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="wh-modal-subtext">This action cannot be undone.</p>
            <div className="wh-modal-actions">
              <button type="button" className="wh-btn-secondary" onClick={() => setDeleteTargetId(null)}>Cancel</button>
              <button type="button" className="wh-btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="wh-account-footer">
        <p>© 2026 WallHub. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default AccountPage;
