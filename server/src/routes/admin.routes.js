import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAdminToken } from "../middleware/adminAuth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { deleteWallpaperFromGithub, uploadWallpaperToGithub } from "../services/github.service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const adminRegisterSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirmation: z.string().optional(),
});

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapWallpaper(row) {
  const categories = (row.categories || [])
    .map((item) => item.category || item)
    .filter(Boolean);

  return {
    ...row,
    name: row.title || row.filename,
    github_url: row.image_url,
    likes: row.likes_count || 0,
    categories,
  };
}

function parseCategoryIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item));
  }

  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

async function loadAdminByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id,name,email,password,is_admin")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadAdminById(id) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id,name,email,is_admin")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function adminGuard(req, res, next) {
  if (!req.adminToken?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const admin = await loadAdminById(req.adminToken.sub);
  if (!admin) {
    return res.status(403).json({ message: "Admin access required." });
  }

  req.admin = admin;
  return next();
}

router.post("/login", async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login payload.",
      errors: parsed.error.flatten(),
    });
  }

  const admin = await loadAdminByEmail(parsed.data.email);
  if (!admin) {
    return res.status(401).json({
      message: "The provided credentials do not match our records.",
    });
  }

  const matches = await bcrypt.compare(parsed.data.password, admin.password);
  if (!matches) {
    return res.status(401).json({
      message: "The provided credentials do not match our records.",
    });
  }

  const token = jwt.sign(
    { sub: admin.id, role: "admin" },
    env.ADMIN_JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    message: "Welcome back!",
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
});

router.post("/register", async (req, res) => {
  const parsed = adminRegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid registration payload.",
      errors: parsed.error.flatten(),
    });
  }

  if (
    parsed.data.password_confirmation &&
    parsed.data.password !== parsed.data.password_confirmation
  ) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const existing = await loadAdminByEmail(parsed.data.email);
  if (existing) {
    return res.status(400).json({ message: "Email already registered." });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const { data, error } = await supabaseAdmin
    .from("admins")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      is_admin: true,
    })
    .select("id,name,email")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(201).json({
    message: "Account created successfully",
    admin: data,
  });
});

router.post("/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out successfully" });
});

router.get("/dashboard", requireAdminToken, adminGuard, async (_req, res) => {
  const [
    { count: totalWallpapers },
    { count: totalCategories },
    { count: totalUsers },
    { data: wallpaperStats },
    { data: recentWallpapers },
    { data: popularWallpapers },
    { data: activeUsers },
    { data: categories },
  ] = await Promise.all([
    supabaseAdmin.from("wallpapers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("categories").select("id", { count: "exact", head: true }).is("parent_id", null),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("wallpapers").select("views,likes_count,downloads"),
    supabaseAdmin.from("wallpapers").select("id,title,filename,image_url,created_at,user_id").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("wallpapers").select("id,title,filename,image_url,views,likes_count,created_at,user_id").order("views", { ascending: false }).limit(5),
    supabaseAdmin.from("users").select("id,name,email,created_at").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("categories").select("id,name,slug,parent_id").order("name", { ascending: true }),
  ]);

  const totalViews = (wallpaperStats || []).reduce((sum, item) => sum + (item.views || 0), 0);
  const totalLikes = (wallpaperStats || []).reduce((sum, item) => sum + (item.likes_count || 0), 0);
  const totalDownloads = (wallpaperStats || []).reduce((sum, item) => sum + (item.downloads || 0), 0);

  return res.json({
    categories: categories || [],
    totalWallpapers: totalWallpapers || 0,
    totalCategories: totalCategories || 0,
    totalUsers: totalUsers || 0,
    totalViews,
    totalLikes,
    totalDownloads,
    recentWallpapers: (recentWallpapers || []).map(mapWallpaper),
    popularWallpapers: (popularWallpapers || []).map(mapWallpaper),
    activeUsers: activeUsers || [],
  });
});

router.get("/wallpapers", requireAdminToken, adminGuard, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,title,description,filename,mime,size,image_url,created_at,views,likes_count,downloads,user_id,categories:wallpaper_categories(category:categories(id,name,parent_id,slug))")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ wallpapers: (data || []).map(mapWallpaper) });
});

router.post("/wallpapers/bulk-upload", requireAdminToken, adminGuard, upload.array("wallpapers", 30), async (req, res) => {
  const files = req.files || [];
  const categoryIds = parseCategoryIds(req.body.categoryIds || req.body.categories);

  if (!files.length) {
    return res.status(400).json({ message: "No wallpaper files selected." });
  }

  if (!categoryIds.length) {
    return res.status(400).json({ message: "Select at least one category." });
  }

  const { data: uploadUser, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (userError) {
    return res.status(500).json({ message: userError.message });
  }

  if (!uploadUser?.id) {
    return res.status(400).json({
      message: "Create at least one regular user before using admin bulk upload.",
    });
  }

  const allowedMimes = new Set(["image/jpeg", "image/png", "image/jpg", "image/webp", "video/mp4"]);
  const created = [];

  for (const file of files) {
    if (!allowedMimes.has(file.mimetype)) {
      return res.status(400).json({ message: `${file.originalname} is not an allowed file type.` });
    }

    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage && file.size > 8388608) {
      return res.status(400).json({ message: `${file.originalname} is larger than 8MB.` });
    }

    if (isVideo && file.size > 17825792) {
      return res.status(400).json({ message: `${file.originalname} is larger than 17MB.` });
    }

    const extension = file.originalname.split(".").pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, "");
    const cleanName = slugify(baseName).replace(/-/g, "_") || randomUUID();
    const fileName = `${cleanName}_${Date.now()}_${randomUUID().slice(0, 8)}.${extension}`;
    const uploadResult = await uploadWallpaperToGithub({
      filename: fileName,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      categoryFolder: "admin-bulk",
      commitMessage: `Admin bulk upload ${fileName}`,
    });

    if (!uploadResult.success) {
      return res.status(500).json({ message: uploadResult.error });
    }

    const { data: wallpaper, error: createError } = await supabaseAdmin
      .from("wallpapers")
      .insert({
        filename: fileName,
        title: baseName,
        image_url: uploadResult.url,
        mime: file.mimetype,
        size: file.size,
        storage_path: uploadResult.path,
        user_id: uploadUser.id,
      })
      .select("id,title,filename,image_url,mime,size,created_at,views,likes_count,downloads")
      .single();

    if (createError) {
      return res.status(500).json({ message: createError.message });
    }

    await supabaseAdmin.from("wallpaper_categories").insert(
      categoryIds.map((categoryId) => ({
        wallpaper_id: wallpaper.id,
        category_id: categoryId,
      }))
    );

    created.push(mapWallpaper(wallpaper));
  }

  return res.status(201).json({
    success: true,
    message: `${created.length} wallpapers uploaded successfully.`,
    wallpapers: created,
  });
});

router.put("/wallpapers/:wallpaperId", requireAdminToken, adminGuard, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional().or(z.literal("")),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("wallpapers")
    .update({
      title: parsed.data.name,
      description: parsed.data.description || null,
    })
    .eq("id", req.params.wallpaperId)
    .select("id,title,description,filename,image_url,mime,views,likes_count,downloads,created_at")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({ success: true, wallpaper: mapWallpaper(data) });
});

router.delete("/wallpapers/:wallpaperId", requireAdminToken, adminGuard, async (req, res) => {
  const { data: wallpaper, error: loadError } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,storage_path")
    .eq("id", req.params.wallpaperId)
    .single();

  if (loadError || !wallpaper) {
    return res.status(404).json({ message: "Wallpaper not found." });
  }

  const deleteResult = await deleteWallpaperFromGithub({
    storagePath: wallpaper.storage_path,
    filename: wallpaper.filename,
  });

  if (!deleteResult.success && deleteResult.error) {
    return res.status(500).json({ message: deleteResult.error });
  }

  const { error } = await supabaseAdmin
    .from("wallpapers")
    .delete()
    .eq("id", req.params.wallpaperId);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "Wallpaper deleted successfully from GitHub storage and database.",
  });
});

router.post("/wallpapers/bulk-delete", requireAdminToken, adminGuard, async (req, res) => {
  const ids = String(req.body.wallpaper_ids || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!ids.length) {
    return res.status(400).json({ message: "No wallpapers selected." });
  }

  const { data: wallpapers, error: loadError } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,storage_path")
    .in("id", ids);

  if (loadError) {
    return res.status(400).json({ message: loadError.message });
  }

  for (const wallpaper of wallpapers || []) {
    const deleteResult = await deleteWallpaperFromGithub({
      storagePath: wallpaper.storage_path,
      filename: wallpaper.filename,
    });

    if (!deleteResult.success && deleteResult.error) {
      return res.status(500).json({ message: deleteResult.error });
    }
  }

  const { error } = await supabaseAdmin.from("wallpapers").delete().in("id", ids);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({ success: true, message: "Selected wallpapers deleted successfully." });
});

router.post("/wallpapers/bulk-update", requireAdminToken, adminGuard, async (req, res) => {
  const ids = String(req.body.wallpaper_ids || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const categoryIds = Array.isArray(req.body.categories)
    ? req.body.categories.map((value) => Number(value)).filter((value) => Number.isInteger(value))
    : [];

  if (!ids.length || !categoryIds.length) {
    return res.status(400).json({ message: "No wallpapers or categories selected." });
  }

  for (const wallpaperId of ids) {
    await supabaseAdmin.from("wallpaper_categories").delete().eq("wallpaper_id", wallpaperId);
    await supabaseAdmin.from("wallpaper_categories").insert(
      categoryIds.map((categoryId) => ({ wallpaper_id: wallpaperId, category_id: categoryId }))
    );
  }

  return res.json({ success: true, message: "Selected wallpapers updated successfully." });
});

router.get("/users", requireAdminToken, adminGuard, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,name,email,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ users: data || [] });
});

router.get("/users/:userId/wallpapers", requireAdminToken, adminGuard, async (req, res) => {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id,name,email")
    .eq("id", req.params.userId)
    .single();

  if (userError) {
    return res.status(404).json({ message: "User not found." });
  }

  const { data: wallpapers, error } = await supabaseAdmin
    .from("wallpapers")
    .select("id,title,filename,image_url,mime,created_at,views,likes_count,downloads")
    .eq("user_id", req.params.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ user, wallpapers: (wallpapers || []).map(mapWallpaper) });
});

router.delete("/users/:userId", requireAdminToken, adminGuard, async (req, res) => {
  const userId = req.params.userId;
  const { data: wallpapers, error: wallpaperError } = await supabaseAdmin
    .from("wallpapers")
    .select("id,filename,storage_path")
    .eq("user_id", userId);

  if (wallpaperError) {
    return res.status(500).json({ message: wallpaperError.message });
  }

  for (const wallpaper of wallpapers || []) {
    const deleteResult = await deleteWallpaperFromGithub({
      storagePath: wallpaper.storage_path,
      filename: wallpaper.filename,
    });

    if (!deleteResult.success && deleteResult.error) {
      return res.status(500).json({ message: deleteResult.error });
    }
  }

  await supabaseAdmin.from("wallpapers").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "User account and all wallpapers deleted successfully from GitHub storage and database",
  });
});

router.get("/categories", requireAdminToken, adminGuard, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,icon,parent_id")
    .order("name", { ascending: true });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ categories: data || [] });
});

router.post("/categories", requireAdminToken, adminGuard, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(255),
    slug: z.string().max(140).optional().or(z.literal("")),
    description: z.string().max(500).optional().or(z.literal("")),
    icon: z.string().max(50).optional().or(z.literal("")),
    parent_id: z.number().int().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      ...parsed.data,
      slug: parsed.data.slug || slugify(parsed.data.name),
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      parent_id: parsed.data.parent_id ?? null,
    })
    .select("id,name,slug,description,icon,parent_id")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(201).json({
    success: true,
    message: "Category created successfully",
    category: data,
  });
});

router.put("/categories/:categoryId", requireAdminToken, adminGuard, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(255),
    slug: z.string().max(140).optional().or(z.literal("")),
    description: z.string().max(500).optional().or(z.literal("")),
    icon: z.string().max(50).optional().or(z.literal("")),
    parent_id: z.number().int().nullable().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({
      ...parsed.data,
      slug: parsed.data.slug || slugify(parsed.data.name),
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      parent_id: parsed.data.parent_id ?? null,
    })
    .eq("id", req.params.categoryId)
    .select("id,name,slug,description,icon,parent_id")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "Category updated successfully",
    category: data,
  });
});

router.delete("/categories/:categoryId", requireAdminToken, adminGuard, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("id", req.params.categoryId);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({ success: true, message: "Category deleted successfully" });
});

export default router;
