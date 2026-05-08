import { apiRequest } from "../api";
import { mergeWallpaperMetadata } from "./wallpaperAssets";

const metadataCache = {
  value: null,
  expiresAt: 0,
};

function getMetadataUrl() {
  return import.meta.env.VITE_WALLPAPER_METADATA_URL || "";
}

export async function loadGitHubWallpaperMetadata({ forceRefresh = false } = {}) {
  const url = getMetadataUrl();
  if (!url) {
    return null;
  }

  const now = Date.now();
  if (!forceRefresh && metadataCache.value && metadataCache.expiresAt > now) {
    return metadataCache.value;
  }

  const response = await fetch(url, {
    cache: "no-cache",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load wallpaper metadata (${response.status}).`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload)
    ? payload
    : payload.wallpapers || payload.items || payload.data || [];

  metadataCache.value = items;
  metadataCache.expiresAt = now + 5 * 60 * 1000;

  return items;
}

export async function loadWallpaperCatalog(path = "/api/wallpapers?sort=latest") {
  const [wallpapers, metadata] = await Promise.all([
    apiRequest(path),
    loadGitHubWallpaperMetadata().catch(() => null),
  ]);

  return mergeWallpaperMetadata(wallpapers || [], metadata || []);
}