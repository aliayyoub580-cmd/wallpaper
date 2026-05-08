import { supabaseAdmin } from "../lib/supabase.js";

export async function listNotifications(userId, { from = 0, to = 19 } = {}) {
  const { data, error, count } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
}
