import { supabaseAdmin } from "../lib/supabase.js";

export async function upsertUserProfile({ id, name, email }) {
  const { error } = await supabaseAdmin.from("users").upsert({ id, name, email });
  if (error) throw error;
}

export async function listUsers() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,name,email,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
