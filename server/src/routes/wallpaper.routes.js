import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { getGithubRawUrl, uploadWallpaperToGithub } from "../services/github.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const createWallpaperSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(600).optional().or(z.literal("")),
  categoryIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return [];
      return value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((num) => Number.isInteger(num));
    }),
  categories: z.array(z.coerce.number().int()).optional(),
});

function normalizeWallpaperRow(row) {
  const categories = (row.categories || [])
    .map((item) => item.category)
    .filter(Boolean);

  return {
    id: row.id,
    filename: row.filename || row.id,
    title: row.title,
    name: row.title,
    description: row.description,
    imageUrl: row.image_url,
    github_url: row.image_url,
    mime: row.mime || "image/jpeg",
    size: row.size || 0,
    downloads: row.downloads || 0,
    width: row.width || 0,
    height: row.height || 0,
    views: row.views,
    likes: row.likes_count,
    likesCount: row.likes_count,
    createdAt: row.created_at,
    categories,
  };
}

router.get("/", async (req, res) => {
  const { search = "", category = "", sort = "latest" } = req.query;

  let query = supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,image_url,mime,size,width,height,views,downloads,likes_count,created_at,categories:wallpaper_categories(category:categories(id,name,slug,parent_id))"
    );

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  if (sort === "trending") {
    query = query
      .order("likes_count", { ascending: false })
      .order("views", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  let normalized = (data || []).map(normalizeWallpaperRow);

  if (category) {
    normalized = normalized.filter((item) =>
      item.categories.some((cat) => cat.slug === category)
    );
  }

  return res.json(normalized);
});

// Laravel parity: GET /wallpaper/{name}
router.get("/by-name/:name", async (req, res) => {
  const { name } = req.params;

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,image_url,mime,size,width,height,views,downloads,likes_count,created_at,categories:wallpaper_categories(category:categories(id,name,slug,parent_id))"
    )
    .eq("filename", name)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  await supabaseAdmin
    .from("wallpapers")
    .update({ views: (data.views || 0) + 1 })
    .eq("id", data.id);

  const isVideo = String(data.mime || "").startsWith("video/");
  const originalWidth = data.width || 0;
  const originalHeight = data.height || 0;

  const allSizes = {
    original: [originalWidth, originalHeight],
    "8k": [7680, 4320],
    "4k": [3840, 2160],
    "1080p": [1920, 1080],
  };

  const sizes = {};

  if (isVideo) {
    sizes.original = [originalWidth || 1920, originalHeight || 1080];
  } else if (originalWidth > 0 && originalHeight > 0) {
    Object.entries(allSizes).forEach(([key, dimensions]) => {
      if (originalWidth >= dimensions[0] && originalHeight >= dimensions[1]) {
        sizes[key] = dimensions;
      }
    });
  } else {
    sizes["1080p"] = [1920, 1080];
  }

  return res.json({
    ...normalizeWallpaperRow(data),
    isVideo,
    originalWidth,
    originalHeight,
    sizes,
  });
});

// Laravel parity: GET /thumbnail/{name}
router.get("/thumbnail/:name", async (req, res) => {
  const { name } = req.params;

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select("filename,image_url,mime,size")
    .eq("filename", name)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  const isLargeVideo = String(data.mime || "").startsWith("video/") && (data.size || 0) > 17825792;

  if (!isLargeVideo) {
    return res.status(400).json({ message: "Thumbnails only available for large videos (>17MB)." });
  }

  // Supabase migration note: thumbnail generation can be added using an edge function.
  return res.json({ thumbnail_url: data.image_url, generated: false });
});

// Laravel parity: GET /download/{name}/{size}
router.get("/download/:name/:size", async (req, res) => {
  const { name } = req.params;

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,image_url,storage_path,mime,downloads")
    .eq("filename", name)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  await supabaseAdmin
    .from("wallpapers")
    .update({ downloads: (data.downloads || 0) + 1 })
    .eq("id", data.id);

  const downloadUrl = data.storage_path?.startsWith("wallpapers/")
    ? getGithubRawUrl(data.storage_path)
    : data.image_url;

  const fileResponse = await fetch(downloadUrl);
  if (!fileResponse.ok) {
    return res.status(502).json({ message: "Unable to fetch wallpaper from GitHub." });
  }

  res.setHeader("Content-Type", fileResponse.headers.get("content-type") || data.mime || "application/octet-stream");
  const contentLength = fileResponse.headers.get("content-length");
  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }
  res.setHeader("Content-Disposition", `attachment; filename="${data.filename || name}"`);

  if (!fileResponse.body) {
    return res.status(502).json({ message: "Unable to stream wallpaper from GitHub." });
  }

  return Readable.fromWeb(fileResponse.body).pipe(res);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select(
      "id,filename,title,description,image_url,mime,size,width,height,storage_path,views,downloads,likes_count,created_at,categories:wallpaper_categories(category:categories(id,name,slug,parent_id))"
    )
    .eq("id", id)
    .single();

  if (error) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  await supabaseAdmin
    .from("wallpapers")
    .update({ views: (data.views || 0) + 1 })
    .eq("id", id);

  return res.json(normalizeWallpaperRow(data));
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  const parsed = createWallpaperSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid wallpaper payload.",
      errors: parsed.error.flatten(),
    });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Image file is required." });
  }

  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "video/mp4",
  ];

  if (!allowedMimes.includes(req.file.mimetype)) {
    return res.status(400).json({
      message: "Only jpeg, png, jpg, webp, and mp4 files are allowed.",
    });
  }

  const isImage = req.file.mimetype.startsWith("image/");
  const isVideo = req.file.mimetype.startsWith("video/");

  if (isImage && req.file.size > 8388608) {
    return res.status(400).json({
      message: "Image files must be 8MB or smaller.",
    });
  }

  if (isVideo && req.file.size > 17825792) {
    return res.status(400).json({
      message: "Video files must be 17MB or smaller.",
    });
  }

  const extension = req.file.originalname.split(".").pop();
  const requestedName = parsed.data.name || parsed.data.title || "wallpaper";
  const cleanName = requestedName
    .replace(/[^A-Za-z0-9\-_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const fileName = `${cleanName || randomUUID()}.${extension}`;
  const categoryIds = parsed.data.categories?.length
    ? parsed.data.categories
    : parsed.data.categoryIds;

  let categoryFolder = null;
  if (categoryIds.length > 0) {
    const { data: selectedCategories } = await supabaseAdmin
      .from("categories")
      .select("id,name,parent_id")
      .in("id", categoryIds);

    const subcategory = (selectedCategories || []).find(
      (cat) => cat.parent_id !== null
    );

    if (subcategory) {
      const { data: parentCategory } = await supabaseAdmin
        .from("categories")
        .select("id,name")
        .eq("id", subcategory.parent_id)
        .single();

      categoryFolder = parentCategory
        ? `${parentCategory.name}/${subcategory.name}`
        : subcategory.name;
    } else if (selectedCategories?.[0]) {
      categoryFolder = selectedCategories[0].name;
    }
  }

  const uploadResult = await uploadWallpaperToGithub({
    filename: fileName,
    fileBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
    categoryFolder,
    commitMessage: `Upload ${fileName}`,
  });

  if (!uploadResult.success) {
    return res.status(500).json({ message: uploadResult.error });
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("wallpapers")
    .insert({
      filename: fileName,
      title: parsed.data.title || parsed.data.name,
      description: parsed.data.description || null,
      image_url: uploadResult.url,
      mime: req.file.mimetype,
      size: req.file.size,
      category_folder: categoryFolder,
      storage_path: uploadResult.path,
      user_id: req.user.id,
    })
    .select("id,filename,title,description,image_url,mime,size,width,height,views,downloads,likes_count,created_at")
    .single();

  if (createError) {
    return res.status(500).json({ message: createError.message });
  }

  if (categoryIds.length > 0) {
    const links = categoryIds.map((categoryId) => ({
      wallpaper_id: created.id,
      category_id: categoryId,
    }));

    await supabaseAdmin.from("wallpaper_categories").insert(links);
  }

  return res.status(201).json({
    message: "Wallpaper uploaded successfully.",
    wallpaper: created,
  });
});

router.post("/:id/like", requireAuth, async (req, res) => {
  const wallpaperId = req.params.id;

  const { data: existingLike } = await supabaseAdmin
    .from("wallpaper_likes")
    .select("id")
    .eq("wallpaper_id", wallpaperId)
    .eq("user_id", req.user.id)
    .maybeSingle();

  const { data: wallpaper } = await supabaseAdmin
    .from("wallpapers")
    .select("likes_count,views")
    .eq("id", wallpaperId)
    .single();

  const currentLikes = wallpaper?.likes_count || 0;
  const currentViews = wallpaper?.views || 0;

  if (existingLike) {
    await supabaseAdmin
      .from("wallpaper_likes")
      .delete()
      .eq("wallpaper_id", wallpaperId)
      .eq("user_id", req.user.id);

    await supabaseAdmin
      .from("wallpapers")
      .update({ likes_count: Math.max(0, currentLikes - 1) })
      .eq("id", wallpaperId);

    return res.json({ liked: false, likes: Math.max(0, currentLikes - 1) });
  }

  await supabaseAdmin.from("wallpaper_likes").insert({
    wallpaper_id: wallpaperId,
    user_id: req.user.id,
  });

  await supabaseAdmin
    .from("wallpapers")
    .update({ likes_count: currentLikes + 1, views: currentViews + 1 })
    .eq("id", wallpaperId);

  return res.json({ liked: true, likes: currentLikes + 1 });
});

export default router;
