export function buildFacebookCaption(wallpaper) {
  const caption = [`📸 ${wallpaper.name || wallpaper.title || "Wallpaper"}`, ""];

  if (wallpaper.description) {
    caption.push(wallpaper.description, "");
  }

  if (wallpaper.category) {
    caption.push(`Category: ${wallpaper.category}`);
  }

  return `${caption.join("\n")}\n\n🔗 Download on WallpaperHub: ${wallpaper.url || wallpaper.github_url || ""}`;
}

export async function postWallpaperToFacebook() {
  return {
    success: false,
    message: "Facebook posting is not implemented in the Node migration yet.",
  };
}
