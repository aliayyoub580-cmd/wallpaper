import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { apiRequest, getApiUrl } from "../api";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";

function joinedLabel(user) {
  if (!user?.created_at) return "Member";
  const date = new Date(user.created_at);
  if (Number.isNaN(date.getTime())) return "Member";
  return `Joined ${date.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
}

function ProfilePage({ session, onLogout }) {
  const { id } = useParams();
  const [payload, setPayload] = useState({ wallpapers: [], user: null });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest(`/api/profile/${id}`),
      loadGitHubWallpaperMetadata().catch(() => null),
    ])
      .then(([data, metadata]) => {
        const wallpapers = metadata ? mergeWallpaperMetadata(data.wallpapers || [], metadata) : (data.wallpapers || []);
        setPayload({ ...data, wallpapers });
      })
      .catch((err) => {
        setError(err.message || "Unable to load profile.");
        setPayload({ wallpapers: [], user: null });
      });
  }, [id]);

  const wallpapers = payload.wallpapers || [];
  const user = payload.user || { id, name: "User" };
  const userName = user.name || user.email || "User";

  return (
    <div className="wh-public-page wh-profile-page">
      <Header user={session.user} onLogout={onLogout} />
      <div className="profile-cover" style={{ backgroundImage: "url('/images/Hero.jpg')" }} />

      <main className="container">
        <div className="profile-header">
          <div className="profile-avatar">{userName.slice(0, 1).toUpperCase()}</div>
          <div className="profile-info">
            <h1>{userName}</h1>
            <span className="profile-joined">{joinedLabel(user)}</span>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item"><div className="stat-value">{wallpapers.length}</div><div className="stat-label">Wallpapers</div></div>
          <div className="stat-item"><div className="stat-value">{(payload.totalViews || 0).toLocaleString()}</div><div className="stat-label">Total Views</div></div>
          <div className="stat-item"><div className="stat-value">{(payload.totalDownloads || 0).toLocaleString()}</div><div className="stat-label">Downloads</div></div>
          <div className="stat-item"><div className="stat-value">{(payload.totalLikes || 0).toLocaleString()}</div><div className="stat-label">Likes</div></div>
        </div>

        {error ? <p className="text-danger text-center">{error}</p> : null}

        {wallpapers.length > 0 ? (
          <div className="wallpapers-grid">
            {wallpapers.map((wallpaper, index) => {
              const filename = wallpaper.filename || wallpaper.name || wallpaper.id;

              return (
                <article key={wallpaper.id} className="wh-trending-card">
                  <WallpaperArtwork
                    wallpaper={wallpaper}
                    alt={wallpaper.name}
                    priority={index < 4}
                    className="wallpaper-image-shell"
                    mediaClassName="wallpaper-image"
                    autoPlayVideo={false}
                    loopVideo={false}
                    mutedVideo
                  />
                  <div className="wallpaper-overlay">
                    <Link to={`/wallpaper/${encodeURIComponent(filename)}`} className="overlay-btn">View</Link>
                    <a href={getApiUrl(`/api/wallpapers/download/${encodeURIComponent(filename)}/original`)} className="overlay-btn">Download</a>
                  </div>
                  <div className="wallpaper-info">
                      <div className="wallpaper-title">{wallpaper.name}{String(wallpaper.mime || "").startsWith("video/") ? " - Video" : ""}</div>
                    <div className="wallpaper-stats">
                      <span><i className="fa-solid fa-eye" /> {(wallpaper.views || 0).toLocaleString()}</span>
                      <span><i className="fa-solid fa-heart" /> {(wallpaper.likes || 0).toLocaleString()}</span>
                    </div>
                    <div className="wallpaper-categories">
                      {(wallpaper.categories || []).slice(0, 3).map((category) => (
                        <span key={category.id || category.slug || category.name} className="category-tag">{category.name}</span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-camera" /></div>
            <h4>No Wallpapers Yet</h4>
            <p>This user has not uploaded any wallpapers yet.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProfilePage;
