import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";

export async function seedAdmin() {
  const password = await bcrypt.hash("password123", 10);
  await supabaseAdmin.from("admins").upsert({
    id: randomUUID(),
    name: "Admin",
    email: "admin@wallpaperhub.local",
    password,
    is_admin: true,
  });
}
