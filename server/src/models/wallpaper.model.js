import { supabaseAdmin } from "../lib/supabase.js";

export async function listWallpapers(select = "*") {
  const { data, error } = await supabaseAdmin.from("wallpapers").select(select).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
