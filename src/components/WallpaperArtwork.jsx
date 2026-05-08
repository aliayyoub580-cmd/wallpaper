import { useEffect, useMemo, useRef, useState } from "react";
import { resolveWallpaperAssets } from "../lib/wallpaperAssets";

import "./WallpaperArtwork.css";

function useIntersectionReady(ref, enabled) {
  const [isReady, setIsReady] = useState(Boolean(enabled));

  useEffect(() => {
    if (enabled) {
      setIsReady(true);
      return undefined;
    }

    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setIsReady(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "256px 0px" }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [enabled, ref]);

  return isReady;
}

function WallpaperArtwork({
  wallpaper,
  alt,
  variant = "gallery",
  priority = false,
  className = "",
  mediaClassName = "",
  sizes,
  autoPlayVideo = false,
  loopVideo = false,
  mutedVideo = true,
  controls = false,
}) {
  const shellRef = useRef(null);
  const assets = useMemo(() => resolveWallpaperAssets(wallpaper, { variant }), [wallpaper, variant]);
  const isVideo = String(wallpaper?.mime || wallpaper?.type || "").startsWith("video/");
  const shouldLoad = useIntersectionReady(shellRef, priority);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setIsLoaded(false);
  }, [assets.galleryUrl, assets.detailUrl, assets.originalUrl]);

  const sourceCandidates = useMemo(() => {
    if (variant === "detail") {
      return [assets.detailUrl, assets.previewUrl, assets.originalUrl, assets.galleryUrl].filter(Boolean);
    }

    return [assets.galleryUrl, assets.previewUrl, assets.originalUrl].filter(Boolean);
  }, [assets.detailUrl, assets.galleryUrl, assets.originalUrl, assets.previewUrl, variant]);

  const activeSource = sourceCandidates[sourceIndex] || sourceCandidates[0] || "";
  const placeholderStyle = assets.blurDataUrl
    ? { backgroundImage: `url(${assets.blurDataUrl})` }
    : undefined;

  function handleError() {
    if (sourceIndex < sourceCandidates.length - 1) {
      setSourceIndex((current) => current + 1);
      return;
    }

    setIsLoaded(true);
  }

  return (
    <div
      ref={shellRef}
      className={`wh-wallpaper-artwork ${className}`.trim()}
      style={{ aspectRatio: assets.aspectRatio, ...placeholderStyle }}
      data-loaded={isLoaded ? "true" : "false"}
      data-priority={priority ? "true" : "false"}
    >
      {!isLoaded ? <div className="wh-wallpaper-artwork__skeleton" aria-hidden="true" /> : null}
      {!isLoaded && assets.blurDataUrl ? <div className="wh-wallpaper-artwork__blur" aria-hidden="true" /> : null}

      {shouldLoad && isVideo ? (
        <video
          className={`wh-wallpaper-artwork__media wh-wallpaper-artwork__video ${mediaClassName}`.trim()}
          src={activeSource}
          poster={assets.posterUrl || undefined}
          preload="metadata"
          autoPlay={autoPlayVideo}
          loop={loopVideo}
          muted={mutedVideo}
          playsInline
          controls={controls}
          onLoadedData={() => setIsLoaded(true)}
          onError={handleError}
        />
      ) : null}

      {shouldLoad && !isVideo ? (
        <img
          src={activeSource}
          srcSet={assets.srcSet || undefined}
          sizes={sizes || assets.sizes}
          alt={alt || wallpaper?.name || wallpaper?.title || "Wallpaper"}
          className={`wh-wallpaper-artwork__media wh-wallpaper-artwork__image ${mediaClassName}`.trim()}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
        />
      ) : null}
    </div>
  );
}

export default WallpaperArtwork;