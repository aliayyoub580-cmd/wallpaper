import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  icon: z.string().max(50).optional().or(z.literal("")),
  parent_id: z.number().int().nullable().optional(),
  slug: z
    .string()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
});

async function getCategoryCounts() {
  const { data, error } = await supabaseAdmin
    .from("wallpaper_categories")
    .select("category_id");

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map();
  (data || []).forEach((row) => {
    const current = map.get(row.category_id) || 0;
    map.set(row.category_id, current + 1);
  });

  return map;
}

router.get("/", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,icon,parent_id")
    .order("name", { ascending: true });

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  try {
    const countMap = await getCategoryCounts();
    const categories = data || [];

    const parents = categories
      .filter((cat) => cat.parent_id == null)
      .map((parent) => {
        const children = categories
          .filter((cat) => cat.parent_id === parent.id)
          .map((child) => ({
            ...child,
            wallpapers_count: countMap.get(child.id) || 0,
          }))
          .sort((a, b) => b.wallpapers_count - a.wallpapers_count);

        const direct = countMap.get(parent.id) || 0;
        const fromChildren = children.reduce(
          (sum, child) => sum + (child.wallpapers_count || 0),
          0
        );

        return {
          ...parent,
          wallpapers_count: direct,
          total_wallpapers_count: direct + fromChildren,
          children,
        };
      })
      .sort(
        (a, b) => (b.total_wallpapers_count || 0) - (a.total_wallpapers_count || 0)
      );

    return res.json(parents);
  } catch (countError) {
    return res.status(500).json({ message: countError.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid category payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      ...parsed.data,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      parent_id:
        typeof parsed.data.parent_id === "number" ? parsed.data.parent_id : null,
    })
    .select("id,name,slug,description,icon,parent_id")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(201).json({
    success: true,
    message: "Category created successfully!",
    category: data,
  });
});

router.put("/:category", requireAuth, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid category payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabaseAdmin
    .from("categories")
    .update({
      ...parsed.data,
      description: parsed.data.description || null,
      icon: parsed.data.icon || null,
      parent_id:
        typeof parsed.data.parent_id === "number" ? parsed.data.parent_id : null,
    })
    .eq("id", req.params.category)
    .select("id,name,slug,description,icon,parent_id")
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "Category updated successfully!",
    category: data,
  });
});

router.delete("/:category", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("categories")
    .delete()
    .eq("id", req.params.category);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "Category deleted successfully!",
  });
});

export default router;
