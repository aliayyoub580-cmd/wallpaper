import { supabaseAdmin } from "../lib/supabase.js";

export async function generateVideoThumbnails() {
  const { data: videos, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,mime,size")
    .like("mime", "video/%")
    .gt("size", 17825792);

  if (error) throw new Error(error.message);

  return {
    processed: (videos || []).length,
    generated: 0,
    placeholders: (videos || []).length,
  };
}
