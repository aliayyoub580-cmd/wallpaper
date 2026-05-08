import { supabaseAdmin } from "../lib/supabase.js";

export async function updateWallpaperDimensions() {
  const { data: wallpapers, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,mime,github_url,width,height")
    .or("width.is.null,height.is.null");

  if (error) throw new Error(error.message);

  let updated = 0;
  const items = wallpapers || [];

  for (const wallpaper of items) {
    const width = wallpaper.width || (String(wallpaper.mime || "").startsWith("video/") ? 1920 : 0);
    const height = wallpaper.height || (String(wallpaper.mime || "").startsWith("video/") ? 1080 : 0);

    await supabaseAdmin.from("wallpapers").update({ width, height }).eq("id", wallpaper.id);
    updated += 1;
  }

  return { updated, failed: 0 };
}
