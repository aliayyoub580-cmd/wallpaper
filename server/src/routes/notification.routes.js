import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const page = Number(req.query.page || 1);
  const perPage = 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({
    data: data || [],
    pagination: {
      page,
      perPage,
      total: count || 0,
      lastPage: Math.max(1, Math.ceil((count || 0) / perPage)),
    },
  });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const notificationId = req.params.id;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", req.user.id);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({ success: true });
});

router.post("/read-all", requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", req.user.id)
    .eq("read", false);

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    success: true,
    message: "All notifications marked as read",
  });
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", req.user.id)
    .eq("read", false);

  if (error) {
    return res.status(500).json({ message: error.message });
  }

  return res.json({ count: count || 0 });
});

export default router;
