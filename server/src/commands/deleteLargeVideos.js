import { supabaseAdmin } from "../lib/supabase.js";
import { deleteWallpaperFromGithub } from "../services/github.service.js";

export async function deleteLargeVideos({ force = false } = {}) {
  const { data: videos, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,mime,size,github_url,category_folder")
    .like("mime", "video/%")
    .gt("size", 17825792);

  if (error) {
    throw new Error(error.message);
  }

  if (!videos || videos.length === 0) {
    return { deleted: 0, failed: 0, skipped: 0 };
  }

  const results = { deleted: 0, failed: 0, skipped: 0 };

  if (!force) {
    results.skipped = videos.length;
    return results;
  }

  for (const video of videos) {
    try {
      if (video.github_url) {
        await deleteWallpaperFromGithub({
          filename: video.filename,
          categoryFolder: video.category_folder,
        });
      }

      await supabaseAdmin.from("wallpapers").delete().eq("id", video.id);
      results.deleted += 1;
    } catch (_error) {
      results.failed += 1;
    }
  }

  return results;
}
