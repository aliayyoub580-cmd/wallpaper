# WallpaperHub

The frontend now lives at the workspace root, with `server/` kept as the backend workspace.

## Structure

- `src/` React app source
- `public/` static assets
- `index.html` Vite entry
- `server/` Express API workspace
- `supabase/schema.sql` database schema and policies

## Run

Install dependencies from the root, then start both apps:

```bash
npm install
npm run dev
```

The frontend runs from the root Vite app, and the backend still runs from `server/`.

## Notes

- Frontend env files now sit at the root, including `.env`, `.env.example`, and `.env.local`.
- Backend environment settings remain under `server/`.

## GitHub Image Delivery

The gallery now supports a GitHub-hosted asset catalog with optional metadata overlays.

Recommended repository layout:

- `wallpapers/thumb/` small gallery images
- `wallpapers/medium/` preview images for detail pages
- `wallpapers/original/` full-resolution downloads
- `wallpapers/metadata.json` optional catalog used by the frontend

Recommended frontend env var:

- `VITE_WALLPAPER_METADATA_URL` points to the GitHub-hosted `metadata.json` file or a CDN URL that serves it.

For best caching, keep filenames immutable, for example `sunset.a8f31c.webp`, and publish new files instead of overwriting old ones. The UI prefers thumbnails first, then preview assets, and only falls back to original images when no smaller variant is available.
