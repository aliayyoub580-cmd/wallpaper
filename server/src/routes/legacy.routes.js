import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

// Legacy parity with api/index.php
router.get("/hello", (_req, res) => {
  res.json({ status: "ok", message: "Hello from Node API", method: "GET" });
});

router.get("/sitemap.xml", async (req, res) => {
  const [{ data: wallpapers, error: wallpaperError }, { data: categories, error: categoryError }] =
    await Promise.all([
      supabaseAdmin
        .from("wallpapers")
        .select("filename,created_at")
        .order("created_at", { ascending: false })
        .limit(10000),
      supabaseAdmin.from("categories").select("slug,created_at").limit(10000),
    ]);

  if (wallpaperError || categoryError) {
    return res.status(500).json({
      message: wallpaperError?.message || categoryError?.message,
    });
  }

  const base = `${req.protocol}://${req.get("host")}`;
  const now = new Date().toISOString();

  const urls = [
    `${base}/`,
    `${base}/trending`,
    ...(categories || []).map((c) => `${base}/category/${c.slug}`),
    ...(wallpapers || []).map((w) => `${base}/wallpaper/${w.filename || ""}`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url}</loc><lastmod>${now}</lastmod></url>`)
    .join("\n")}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  return res.send(xml);
});

// Legacy parity with /search?q=
router.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (!query) {
    return res.json([]);
  }

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,image_url,mime,downloads,views,likes_count,created_at,categories:wallpaper_categories(category:categories(id,name,slug,parent_id))"
    )
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const mapped = (data || []).map((row) => ({
    id: row.id,
    name: row.title,
    filename: row.filename || row.id,
    description: row.description,
    github_url: row.image_url,
    mime: row.mime || "",
    views: row.views,
    likes: row.likes_count,
    downloads: row.downloads || 0,
    slug: row.id,
    categories: (row.categories || []).map((item) => item.category).filter(Boolean),
  }));

  return res.json(mapped);
});

// Legacy parity with /trending
router.get("/trending", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,user_id,filename,title,description,image_url,mime,views,likes_count,downloads,created_at,categories:wallpaper_categories(category:categories(id,name,slug))"
    )
    .order("likes_count", { ascending: false })
    .order("views", { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const mapped = (data || []).map((row) => ({
    id: row.id,
    name: row.title,
    filename: row.filename || row.id,
    description: row.description,
    views: row.views || 0,
    likes: row.likes_count || 0,
    downloads: row.downloads || 0,
    user_liked: false,
    github_url: row.image_url,
    user: row.user_id ? { id: row.user_id, name: null } : null,
    categories: (row.categories || []).map((item) => item.category).filter(Boolean),
  }));

  return res.json({
    wallpapers: mapped,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: mapped.length,
      total: mapped.length,
    },
  });
});

// Basic profile endpoint parity with /profile/{id}
router.get("/profile/:id", async (req, res) => {
  const userId = req.params.id;

  const { data: wallpapers, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,mime,image_url,views,likes_count,downloads,created_at,categories:wallpaper_categories(category:categories(id,name,slug))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  const mapped = (wallpapers || []).map((row) => ({
    id: row.id,
    name: row.title,
    filename: row.filename || row.id,
    description: row.description,
    mime: row.mime || "",
    views: row.views || 0,
    likes: row.likes_count || 0,
    downloads: row.downloads || 0,
    user_liked: false,
    github_url: row.image_url,
    categories: (row.categories || []).map((item) => item.category).filter(Boolean),
  }));

  return res.json({
    user: { id: userId },
    wallpapers: mapped,
    totalViews: mapped.reduce((sum, item) => sum + item.views, 0),
    totalDownloads: mapped.reduce((sum, item) => sum + item.downloads, 0),
    totalLikes: mapped.reduce((sum, item) => sum + item.likes, 0),
  });
});

export default router;
