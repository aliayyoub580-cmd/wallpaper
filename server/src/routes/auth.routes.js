import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { supabase, supabaseAdmin } from "../lib/supabase.js";

const router = Router();

const signUpSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirmation: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

function getUserName(user) {
  return user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || null;
}

async function syncUserProfile(user) {
  if (!user?.id) return;

  await supabaseAdmin.from("users").upsert({
    id: user.id,
    name: getUserName(user),
    email: user.email,
  });
}

function buildClientUrl(path) {
  const base = env.CLIENT_ORIGIN.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

router.post("/signup", async (req, res) => {
  const parsed = signUpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid signup payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { email, password, password_confirmation, name } = parsed.data;

  if (password_confirmation && password !== password_confirmation) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
    },
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (data.user) {
    await syncUserProfile({
      ...data.user,
      user_metadata: {
        ...(data.user.user_metadata || {}),
        ...(name ? { name } : {}),
      },
    });
  }

  return res.status(201).json({
    message: data.session
      ? "Account created successfully."
      : "A confirmation link has been sent to your email address. Please confirm your email before signing in.",
    requiresEmailConfirmation: !data.session,
    session: data.session,
    user: data.user,
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login payload.",
      errors: parsed.error.flatten(),
    });
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const message = String(error.message || "").toLowerCase();
    const isUnconfirmed = message.includes("email") && message.includes("confirm");

    return res.status(200).json({
      success: false,
      message: isUnconfirmed
        ? "Please confirm your email address before signing in. We sent a confirmation link to your inbox."
        : "The email or password you entered is incorrect.",
      requiresEmailConfirmation: isUnconfirmed,
    });
  }

  if (data.user) {
    await syncUserProfile(data.user);
  }

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    session: data.session,
    user: data.user,
  });
});

router.get("/google", async (_req, res) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildClientUrl("/auth/callback"),
    },
  });

  if (error || !data?.url) {
    return res.status(500).json({
      message: error?.message || "Google sign-in is not available right now.",
    });
  }

  return res.redirect(data.url);
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing access token." });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid or expired access token." });
  }

  await syncUserProfile(data.user);

  return res.json({ user: data.user });
});

router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Refresh token is required.",
      errors: parsed.error.flatten(),
    });
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    return res.status(401).json({
      message: "Your login session has expired. Please log in again.",
    });
  }

  return res.json({
    message: "Session refreshed.",
    session: data.session,
    user: data.user,
  });
});

router.post("/logout", (_req, res) => {
  return res.json({ message: "Logout successful." });
});

export default router;
