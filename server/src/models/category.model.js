import { supabaseAdmin } from "../lib/supabase.js";

export async function listCategories() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id,name,slug,description,icon,parent_id")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}
