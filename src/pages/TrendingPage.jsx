import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import WallpaperArtwork from "../components/WallpaperArtwork";
import Header from "../components/Header";
import { apiRequest, getApiUrl } from "../api";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";

function categoryText(wallpaper) {
  return (wallpaper.categories || []).map((category) => category.name).filter(Boolean).join(", ");
}

function TrendingPage({ session, onLogout }) {
  const [payload, setPayload] = useState({ wallpapers: [], pagination: null });
  const [filter, setFilter] = useState("trending");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/api/trending"),
      loadGitHubWallpaperMetadata().catch(() => null),
    ])
      .then(([data, metadata]) => {
        const wallpapers = metadata ? mergeWallpaperMetadata(data.wallpapers || [], metadata) : (data.wallpapers || []);
        setPayload({ ...data, wallpapers });
      })
      .catch((err) => {
        setError(err.message || "Unable to load trending wallpapers.");
        setPayload({ wallpapers: [], pagination: null });
      });
  }, []);

  const wallpapers = useMemo(() => {
    const data = [...(payload.wallpapers || [])];

    if (filter === "views") {
      data.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (filter === "likes") {
      data.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (filter === "downloads") {
      data.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    }

    return data;
  }, [filter, payload.wallpapers]);

  return (
    <div className="wh-public-page">
      <Header user={session.user} onLogout={onLogout} />
      <main className="container wh-trending-container">
        <div className="trending-header">
          <h1><i className="fa-solid fa-fire" /> Trending Wallpapers</h1>
          <p>Most viewed and liked wallpapers this month</p>
        </div>

        <div className="trending-filters">
          {[
            ["trending", "Trending"],
            ["views", "Most Viewed"],
            ["likes", "Most Liked"],
            ["downloads", "Most Downloaded"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`filter-btn ${filter === value ? "active" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="text-danger text-center">{error}</p> : null}

        {wallpapers.length > 0 ? (
          <div className="wallpapers-grid">
            {wallpapers.map((wallpaper, index) => {
              const filename = wallpaper.filename || wallpaper.name || wallpaper.id;
              const isVideo = String(wallpaper.mime || "").startsWith("video/");

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
                    <a href={getApiUrl(`/api/wallpapers/download/${encodeURIComponent(filename)}/${String(wallpaper.mime || "").startsWith("video/") ? "original" : "1080p"}`)} className="overlay-btn">Download</a>
                  </div>
                  <div className="wallpaper-info">
                    <div className="wallpaper-title">{wallpaper.name}{isVideo ? " - Video" : ""}</div>
                    <div className="wallpaper-stats">
                      <span><i className="fa-solid fa-eye" /> {(wallpaper.views || 0).toLocaleString()}</span>
                      <span><i className="fa-solid fa-heart" /> {(wallpaper.likes || 0).toLocaleString()}</span>
                      <span><i className="fa-solid fa-download" /> {(wallpaper.downloads || 0).toLocaleString()}</span>
                    </div>
                    {categoryText(wallpaper) ? (
                      <div className="wallpaper-categories">
                        {(wallpaper.categories || []).slice(0, 3).map((category) => (
                          <span key={category.id || category.slug || category.name} className="category-tag">{category.name}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-chart-line" /></div>
            <h4>No Trending Wallpapers Yet</h4>
            <p>Check back soon as more wallpapers gain popularity!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default TrendingPage;
