function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function normalizeGithubBlobUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const blobIndex = parts.indexOf("blob");

      if (blobIndex > 1 && parts.length > blobIndex + 2) {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[blobIndex + 1];
        const filePath = parts.slice(blobIndex + 2).join("/");
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }
    }

    return parsed.toString();
  } catch (_error) {
    return String(url);
  }
}

function uniqueCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    if (!candidate.url) return false;
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function readVariantUrl(wallpaper, keys) {
  return normalizeGithubBlobUrl(
    firstDefined(
      ...keys.map((key) => wallpaper?.[key]),
      ...keys.map((key) => wallpaper?.assets?.[key]),
      ...keys.map((key) => wallpaper?.asset_urls?.[key]),
      ...keys.map((key) => wallpaper?.media?.[key])
    )
  );
}

export function resolveWallpaperAssets(wallpaper = {}, { variant = "gallery" } = {}) {
  const width = Number(
    firstDefined(
      wallpaper.width,
      wallpaper.originalWidth,
      wallpaper.previewWidth,
      wallpaper.thumbnailWidth,
      wallpaper.image_width,
      wallpaper.imageWidth
    ) || 0
  );
  const height = Number(
    firstDefined(
      wallpaper.height,
      wallpaper.originalHeight,
      wallpaper.previewHeight,
      wallpaper.thumbnailHeight,
      wallpaper.image_height,
      wallpaper.imageHeight
    ) || 0
  );

  const thumbnailUrl = readVariantUrl(wallpaper, [
    "thumbnail_url",
    "thumbnailUrl",
    "thumb_url",
    "thumbUrl",
    "preview_thumb_url",
  ]);

  const previewUrl = readVariantUrl(wallpaper, ["preview_url", "previewUrl", "medium_url", "mediumUrl"]);

  const originalUrl = normalizeGithubBlobUrl(
    firstDefined(
      wallpaper.original_url,
      wallpaper.originalUrl,
      wallpaper.image_url,
      wallpaper.imageUrl,
      wallpaper.github_url,
      wallpaper.url
    )
  );

  const galleryUrl = thumbnailUrl || previewUrl || originalUrl;
  const detailUrl = previewUrl || originalUrl || galleryUrl;
  const posterUrl = thumbnailUrl || previewUrl || originalUrl;
  const blurDataUrl = firstDefined(
    wallpaper.blur_data_url,
    wallpaper.blurDataURL,
    wallpaper.blurPlaceholder,
    wallpaper.placeholder
  );

  const candidates = uniqueCandidates([
    { url: galleryUrl, width: wallpaper.thumbnailWidth || wallpaper.thumbWidth || 480 },
    { url: previewUrl || originalUrl, width: wallpaper.previewWidth || 1200 },
    { url: originalUrl, width: width || 1600 },
  ]);

  const srcSet = candidates.length > 1 ? candidates.map((candidate) => `${candidate.url} ${candidate.width}w`).join(", ") : "";
  const aspectRatio = width > 0 && height > 0 ? `${width} / ${height}` : variant === "detail" ? "16 / 10" : "4 / 5";

  return {
    width,
    height,
    aspectRatio,
    thumbnailUrl,
    previewUrl,
    originalUrl,
    galleryUrl,
    detailUrl,
    posterUrl,
    srcSet,
    blurDataUrl,
    sizes:
      variant === "detail"
        ? "(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1100px"
        : "(max-width: 576px) 100vw, (max-width: 992px) 50vw, 25vw",
  };
}

export function mergeWallpaperMetadata(wallpapers = [], metadata = []) {
  const items = Array.isArray(metadata) ? metadata : metadata?.wallpapers || metadata?.items || [];
  const metadataMap = new Map();

  items.forEach((item) => {
    if (!item) return;
    const keys = [item.id, item.filename, item.slug, item.name, item.title, item.image_name, item.wallpaper_id]
      .map((key) => String(key || "").trim())
      .filter(Boolean);

    keys.forEach((key) => metadataMap.set(key, item));
  });

  return wallpapers.map((wallpaper) => {
    const matchKey = [wallpaper.id, wallpaper.filename, wallpaper.slug, wallpaper.name, wallpaper.title]
      .map((key) => String(key || "").trim())
      .find(Boolean);
    const metadataItem = matchKey ? metadataMap.get(matchKey) : null;

    const merged = {
      ...wallpaper,
      ...(metadataItem || {}),
    };

    const assets = resolveWallpaperAssets(merged, { variant: "gallery" });

    return {
      ...merged,
      width: merged.width || assets.width,
      height: merged.height || assets.height,
      imageUrl: assets.galleryUrl,
      image_url: assets.galleryUrl,
      github_url: assets.originalUrl || assets.galleryUrl,
      originalUrl: assets.originalUrl,
      original_url: assets.originalUrl,
      thumbnailUrl: assets.thumbnailUrl,
      thumbnail_url: assets.thumbnailUrl,
      previewUrl: assets.previewUrl,
      preview_url: assets.previewUrl,
      blurDataURL: assets.blurDataUrl,
      blur_data_url: assets.blurDataUrl,
      aspectRatio: assets.aspectRatio,
      srcSet: assets.srcSet,
      sizes: assets.sizes,
    };
  });
}