import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { deleteWallpaperFromGithub } from "../services/github.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me/account", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data: wallpapers, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,image_url,mime,size,views,downloads,likes_count,created_at,categories:wallpaper_categories(category:categories(id,name,slug))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const items = (wallpapers || []).map((row) => ({
    ...row,
    name: row.title || row.filename,
    github_url: row.image_url,
    likes: row.likes_count || 0,
    categories: (row.categories || []).map((item) => item.category).filter(Boolean),
  }));
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalDownloads = items.reduce(
    (sum, item) => sum + (item.downloads || 0),
    0
  );
  const totalLikes = items.reduce(
    (sum, item) => sum + (item.likes || 0),
    0
  );

  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name || null,
    },
    wallpapers: items,
    totalViews,
    totalDownloads,
    totalLikes,
  });
});

router.delete("/my-wallpapers/:wallpaperId", requireAuth, async (req, res) => {
  const wallpaperId = req.params.wallpaperId;

  const { data: wallpaper, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,user_id,storage_path")
    .eq("id", wallpaperId)
    .single();

  if (error || !wallpaper) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  if (wallpaper.user_id !== req.user.id) {
    return res.status(403).json({ message: "Unauthorized action." });
  }

  if (wallpaper.storage_path) {
    const deleteResult = await deleteWallpaperFromGithub({
      storagePath: wallpaper.storage_path,
      filename: wallpaperId,
    });

    if (!deleteResult.success && deleteResult.error) {
      return res.status(500).json({ message: deleteResult.error });
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from("wallpapers")
    .delete()
    .eq("id", wallpaperId)
    .eq("user_id", req.user.id);

  if (deleteError) {
    return res.status(500).json({ message: deleteError.message });
  }

  return res.json({
    success: true,
    message: "Wallpaper deleted successfully from all storage",
  });
});

export default router;
