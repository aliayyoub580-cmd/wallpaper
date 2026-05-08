import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../lib/supabase.js";

export async function findAdminByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id,name,email,password,is_admin")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findAdminById(id) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("id,name,email,is_admin")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createAdmin({ name, email, password }) {
  const hashed = await bcrypt.hash(password, 10);
  const { data, error } = await supabaseAdmin
    .from("admins")
    .insert({ name, email, password: hashed, is_admin: true })
    .select("id,name,email")
    .single();

  if (error) throw error;
  return data;
}
