import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { apiRequest } from "../api";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";
import AdminLayout from "./components/AdminLayout";

function AdminUserWallpapersPage({ adminSession, onAdminLogout }) {
  const { userId } = useParams();
  const [payload, setPayload] = useState({ user: null, wallpapers: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest(`/api/admin/users/${userId}/wallpapers`, {
        headers: { Authorization: `Bearer ${adminSession.token}` },
      }),
      loadGitHubWallpaperMetadata().catch(() => null),
    ])
      .then(([data, metadata]) => {
        const wallpapers = metadata ? mergeWallpaperMetadata(data.wallpapers || [], metadata) : (data.wallpapers || []);
        setPayload({ ...data, wallpapers });
      })
      .catch((err) => setError(err.message || "Unable to load user wallpapers."));
  }, [adminSession.token, userId]);

  const user = payload.user || {};
  const wallpapers = payload.wallpapers || [];

  return (
    <AdminLayout admin={adminSession.admin} onLogout={onAdminLogout} title="User Wallpapers">
      <div className="admin-card wh-admin-toolbar">
        <div>
          <h3>{user.name || user.email || "User"}</h3>
          <p>{wallpapers.length} uploaded wallpapers</p>
        </div>
        <Link to="/admin/users" className="admin-link-btn">
          <i className="fas fa-arrow-left" /> Back to Users
        </Link>
      </div>

      {error ? <p className="wh-alert wh-alert-danger">{error}</p> : null}

      {wallpapers.length > 0 ? (
        <div className="wh-admin-wallpaper-grid">
          {wallpapers.map((wallpaper) => {
            const filename = wallpaper.filename || wallpaper.name || wallpaper.id;
            return (
              <article key={wallpaper.id} className="wh-admin-wallpaper-card">
                <div className="wh-admin-wallpaper-media">
                  <WallpaperArtwork
                    wallpaper={wallpaper}
                    alt={wallpaper.name}
                    priority={false}
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
                  </div>
                </div>
                <div className="wh-admin-wallpaper-info">
                  <h4>{wallpaper.name || wallpaper.title || filename}</h4>
                  <div className="wh-admin-meta">
                    <span><i className="fas fa-eye" /> {(wallpaper.views || 0).toLocaleString()}</span>
                    <span><i className="fas fa-heart" /> {(wallpaper.likes_count || 0).toLocaleString()}</span>
                    <span><i className="fas fa-download" /> {(wallpaper.downloads || 0).toLocaleString()}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-card empty-state">
          <div className="empty-state-icon"><i className="fas fa-images" /></div>
          <h4>No wallpapers uploaded</h4>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminUserWallpapersPage;
