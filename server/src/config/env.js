import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalEnvString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);

const envString = (defaultValue) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().default(defaultValue)
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  CLIENT_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().url().default("https://example.supabase.co"),
  SUPABASE_ANON_KEY: z.string().min(1).default("replace-with-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .default("replace-with-service-role-key"),
  SUPABASE_STORAGE_BUCKET: z.string().default("wallpapers"),
  GITHUB_TOKEN: optionalEnvString,
  GITHUB_OWNER: envString("Atif-Ayyoub"),
  GITHUB_REPO: envString("WallpaperCave.com"),
  GITHUB_BRANCH: envString("main"),
  GITHUB_IMAGE_BASE_PATH: envString("wallpapers"),
  ADMIN_JWT_SECRET: z.string().min(16).default("replace-with-a-long-admin-jwt-secret"),
});

const parsed = envSchema.parse(process.env);

const parsedOrigins = (parsed.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  ...parsed,
  CLIENT_ORIGINS: parsedOrigins.length ? parsedOrigins : [parsed.CLIENT_ORIGIN],
};
