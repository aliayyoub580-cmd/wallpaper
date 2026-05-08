# Wallhub -> WallpaperHub Sequential Migration

This tracker follows the requested workflow: read one Wallhub file, convert it, then proceed to the next.

## Converted

1. `api/index.php`

- Added equivalent API behavior in Node:
    - `GET /api/hello`
    - CORS/JSON behavior is already handled globally in Express.

2. `app/Http/Controllers/WallpaperController.php`

- Converted endpoint behaviors into Node routes:
    - `GET /api/wallpapers/by-name/:name` (details + view increment + size map)
    - `GET /api/wallpapers/download/:name/:size` (original redirect + size validation)
    - `GET /api/wallpapers/thumbnail/:name` (video thumbnail API placeholder)
    - Like parity improvements (`likes` response + view increment on like)
- Added metadata field parity in schema and uploads:
    - `filename`, `mime`, `size`, `width`, `height`, `downloads`

3. `app/Http/Controllers/CategoryController.php`

- Converted parent/child category hierarchy and wallpaper counts in `GET /api/categories`.
- Added CRUD parity fields and responses:
    - `description`, `icon`, `parent_id`
    - success/message/category response format.

4. `app/Http/Controllers/UploadController.php`

- Upload endpoint now supports Laravel-style payload fields (`name`, `categories`) in addition to current ones.
- Added media constraints parity:
    - accepted mime types, 8MB image limit, 17MB video limit.
- Added upload metadata parity:
    - `category_folder`, `filename`, `mime`, `size`.

5. `app/Http/Controllers/UserAuthController.php`

- Added Laravel-compatible registration fields in `/api/auth/signup`:
    - `name`, `password_confirmation`, min-length parity.
- Added `/api/auth/logout` endpoint.

6. `app/Http/Controllers/UserController.php`

- Added `/api/users/me/account` with user wallpapers and totals:
    - `totalViews`, `totalDownloads`, `totalLikes`.
- Added `/api/users/my-wallpapers/:wallpaperId` delete endpoint with owner checks and storage cleanup.

7. `app/Http/Controllers/NotificationController.php`
8. `app/Models/Notification.php`

- Added Supabase-backed notification APIs:
    - `GET /api/notifications`
    - `POST /api/notifications/:id/read`
    - `POST /api/notifications/read-all`
    - `GET /api/notifications/unread-count`
- Added `notifications` table + RLS policies in schema.

9. `app/Http/Controllers/ProfileController.php`

- Added profile parity enhancements in legacy routes:
    - `GET /api/profile/:id` with mapped wallpaper fields + totals.
    - `GET /api/trending` with mapped payload and pagination object.

10. `app/Http/Controllers/SitemapController.php`

- Added `GET /api/sitemap.xml` XML generation route with wallpapers + categories.

11. `app/Http/Controllers/AdminAuthController.php`
12. `app/Http/Controllers/AdminDashboardController.php`

- Added JWT-backed admin APIs under `/api/admin`:
    - login/register/logout
    - dashboard stats
    - wallpapers/users/categories CRUD
    - bulk wallpaper actions
- Added `admins` and `users` tables to Supabase schema for parity.

13. `app/Console/Commands/*`

- Added runnable Node scripts for the Laravel console commands:
    - delete large videos
    - generate video thumbnails
    - test Facebook post
    - update wallpaper dimensions
    - verify GitHub setup

14. `app/Http/Middleware/OptimizeApiResponse.php`
15. `app/Traits/ApiResponse.php`
16. `app/Providers/AppServiceProvider.php`

- Added Node equivalents for response optimization, API response helpers, and provider bootstrap.

17. `config/*.php`
18. `bootstrap/*.php`

- Added Node config/bootstrap equivalents under `server/src/config` and `server/src/bootstrap`.

19. `database/factories/UserFactory.php`
20. `database/seeders/*.php`

- Added Node factory/seeder equivalents under `server/src/factories` and `server/src/seeders`.

## In Progress

21. `routes/web.php`

- Converting Laravel route surface into Node/Supabase endpoints.
- Core routes already present: auth, categories, wallpapers, like, upload.
- Next: add legacy-compatible aliases and remaining endpoints (search/trending/profile/notifications/admin stubs).

## Pending (queued after routes)

- `app/Http/Controllers/*.php`
- `app/Models/*.php`
- `database/migrations/*.php`
- `resources/views/*.blade.php`
- `resources/js/*.js`
- `resources/css/*.css`
