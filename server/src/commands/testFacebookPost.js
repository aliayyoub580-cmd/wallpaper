import { supabaseAdmin } from "../lib/supabase.js";
import { buildFacebookCaption, postWallpaperToFacebook } from "../services/facebook.service.js";

export async function testFacebookPost(wallpaperId) {
  const query = supabaseAdmin.from("wallpapers").select("*");
  const { data: wallpaper, error } = wallpaperId
    ? await query.eq("id", wallpaperId).single()
    : await query.limit(1).single();

  if (error || !wallpaper) {
    throw new Error("No wallpapers found in database");
  }

  const caption = buildFacebookCaption(wallpaper);
  const result = await postWallpaperToFacebook(wallpaper, caption);
  return { wallpaper, caption, result };
}
