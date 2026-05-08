export const appConfig = {
  name: "WallpaperHub",
  env: process.env.NODE_ENV || "development",
  debug: (process.env.APP_DEBUG || "false") === "true",
  url: process.env.APP_URL || "http://localhost:5000",
};
