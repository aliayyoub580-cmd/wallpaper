export const filesystemsConfig = {
  default: process.env.FILESYSTEM_DISK || "github",
  publicBucket: process.env.SUPABASE_STORAGE_BUCKET || "wallpapers",
};
