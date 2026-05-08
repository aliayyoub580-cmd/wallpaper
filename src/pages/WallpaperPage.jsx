import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, getApiUrl } from "../api";
import WallpaperArtwork from "../components/WallpaperArtwork";
import { loadGitHubWallpaperMetadata } from "../lib/wallpaperCatalog";
import { mergeWallpaperMetadata } from "../lib/wallpaperAssets";

const downloadLabels = {
  original: { icon: "fas fa-image", label: "Original", desc: "Full Quality" },
  "8k": { icon: "fas fa-desktop", label: "8K", desc: "7680 x 4320" },
  "6k": { icon: "fas fa-desktop", label: "6K", desc: "6016 x 3384" },
  "4k": { icon: "fas fa-desktop", label: "4K", desc: "3840 x 2160" },
  "2k": { icon: "fas fa-tv", label: "2K", desc: "2560 x 1440" },
  "1080p": { icon: "fas fa-laptop", label: "1080p", desc: "1920 x 1080" },
  "720p": { icon: "fas fa-mobile-alt", label: "720p", desc: "1280 x 720" },
};

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function WallpaperPage() {
  const { name } = useParams();
  const [wallpaper, setWallpaper] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWallpaper(null);
    setError("");

    Promise.all([
      apiRequest(`/api/wallpapers/by-name/${encodeURIComponent(name)}`),
      loadGitHubWallpaperMetadata().catch(() => null),
    ])
      .then(([wallpaperData, metadata]) => {
        const merged = metadata ? mergeWallpaperMetadata([wallpaperData], metadata) : [wallpaperData];
        setWallpaper(merged[0]);
      })
      .catch((err) => setError(err.message || "Wallpaper not found."));
  }, [name]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const sizes = useMemo(() => {
    if (!wallpaper?.sizes) return {};
    return wallpaper.sizes;
  }, [wallpaper]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard?.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_error) {
      window.alert("Failed to copy link");
    }
  }

  function openFullscreen() {
    const element = document.querySelector(".wallpaper-img-shell");
    if (element?.requestFullscreen) {
      element.requestFullscreen();
    }
  }

  if (error) {
    return (
      <main className="wh-wallpaper-detail-page text-light">
        <div className="container py-4">
          <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left" /> Back to Gallery
          </Link>
          <div className="glass-card mt-4">
            <h1 className="text-warning">Wallpaper not found</h1>
            <p>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!wallpaper) {
    return (
      <main className="wh-wallpaper-detail-page text-light">
        <div className="container py-4">
          <div className="glass-card">Loading wallpaper...</div>
        </div>
      </main>
    );
  }

  const title = wallpaper.name || wallpaper.title || name;
  const isVideo = Boolean(wallpaper.isVideo) || String(wallpaper.mime || "").startsWith("video/");
  const sourceUrl = wallpaper.github_url || wallpaper.imageUrl || wallpaper.image_url;
  const originalLabel = wallpaper.originalWidth && wallpaper.originalHeight
    ? `${wallpaper.originalWidth} x ${wallpaper.originalHeight}`
    : downloadLabels.original.desc;
  const extension = String(wallpaper.filename || name).split(".").pop() || "file";

  return (
    <main className="wh-wallpaper-detail-page text-light">
      <div className="container py-4">
        <div className="mb-4">
          <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left" />
            Back to Gallery
          </Link>
        </div>

        <div className="glass-card">
          <div className="wallpaper-container">
            <WallpaperArtwork
              wallpaper={wallpaper}
              alt={title}
              variant="detail"
              priority
              className="wallpaper-img-shell"
              mediaClassName="wallpaper-img"
              autoPlayVideo={Boolean(isVideo)}
              loopVideo={Boolean(isVideo)}
              mutedVideo
              controls={Boolean(isVideo)}
            />
            <button type="button" className="fullscreen-icon" onClick={openFullscreen}>
              <i className="fas fa-expand" /> Fullscreen
            </button>
          </div>
        </div>

        <div className="glass-card mb-3 mt-4">
          <h4 className="mb-4 fw-bold text-warning">
            <i className="fas fa-download me-2" />Download Options
          </h4>
          {isVideo ? (
            <p className="text-muted mb-3" style={{ fontSize: 14 }}>
              <i className="fas fa-info-circle me-1" />Videos are available in original quality only
            </p>
          ) : null}

          <div className="download-grid">
            {Object.entries(sizes).map(([sizeKey, dimensions]) => {
              const info = downloadLabels[sizeKey] || {
                icon: "fas fa-download",
                label: sizeKey.toUpperCase(),
                desc: `${dimensions?.[0] || ""} x ${dimensions?.[1] || ""}`.trim(),
              };
              const desc = sizeKey === "original" ? originalLabel : info.desc;

              return (
                <a
                  key={sizeKey}
                  href={getApiUrl(`/api/wallpapers/download/${encodeURIComponent(name)}/${sizeKey}`)}
                  className="download-btn"
                  title={`${info.label} - ${desc}`}
                >
                  <i className={isVideo && sizeKey === "original" ? "fas fa-video" : info.icon} />
                  <span className="download-label">{info.label}</span>
                  <span className="download-resolution">{desc}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="info-stats">
          <h5 className="mb-3 fw-bold text-warning">
            <i className="fas fa-share-alt me-2" />Share This Wallpaper
          </h5>
          <div className="social-share-buttons">
            <a href={`https://twitter.com/intent/tweet?text=Check%20out%20this%20wallpaper!&url=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noreferrer" className="share-btn share-twitter" title="Share on Twitter">
              <i className="fab fa-twitter" />
              <span>Twitter</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noreferrer" className="share-btn share-facebook" title="Share on Facebook">
              <i className="fab fa-facebook-f" />
              <span>Facebook</span>
            </a>
            <a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(sourceUrl)}&description=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="share-btn share-pinterest" title="Pin it">
              <i className="fab fa-pinterest" />
              <span>Pinterest</span>
            </a>
            <a href={`https://reddit.com/submit?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="share-btn share-reddit" title="Share on Reddit">
              <i className="fab fa-reddit" />
              <span>Reddit</span>
            </a>
            <button type="button" className="share-btn share-link" onClick={copyToClipboard} title="Copy Link">
              <i className={`fas ${copied ? "fa-check" : "fa-link"}`} />
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        <div className="info-stats">
          <h5 className="mb-3 fw-bold text-warning">
            <i className="fas fa-info-circle me-2" />Wallpaper Information
          </h5>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-file-image me-2" />Filename</span>
            <span className="stat-value">{wallpaper.filename || name}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-expand-arrows-alt me-2" />Available Sizes</span>
            <span className="stat-value">{Object.keys(sizes).length} {Object.keys(sizes).length === 1 ? "Resolution" : "Resolutions"}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-file-code me-2" />Format</span>
            <span className="stat-value">{extension.toUpperCase()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-eye me-2" />Views</span>
            <span className="stat-value">{(wallpaper.views || 0).toLocaleString()}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-calendar me-2" />Uploaded</span>
            <span className="stat-value">{formatDate(wallpaper.createdAt || wallpaper.created_at)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label"><i className="fas fa-tag me-2" />Quality</span>
            <span className="stat-value">Premium HD</span>
          </div>
        </div>
      </div>

      <a href={getApiUrl(`/api/wallpapers/download/${encodeURIComponent(name)}/original`)} className="floating-download-all">
        <i className="fas fa-download" />
        Download Original
      </a>
    </main>
  );
}

export default WallpaperPage;
