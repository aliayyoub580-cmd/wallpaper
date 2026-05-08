import crypto from "crypto";
import mysql from "mysql2/promise";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";

const mysqlEnvSchema = z.object({
  MYSQL_HOST: z.string().min(1, "MYSQL_HOST is required"),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().min(1, "MYSQL_USER is required"),
  MYSQL_PASSWORD: z.string().default(""),
  MYSQL_DATABASE: z.string().min(1, "MYSQL_DATABASE is required"),
});

function deterministicUuid(scope, id) {
  const hash = crypto.createHash("sha1").update(`${scope}:${id}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function chunk(items, size = 200) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function upsertBatches(table, rows, onConflict) {
  if (!rows.length) return 0;

  for (const batch of chunk(rows)) {
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });

    if (error) throw new Error(`Failed upsert on ${table}: ${error.message}`);
  }

  return rows.length;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `
      SELECT 1 AS present
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
      LIMIT 1
    `,
    [process.env.MYSQL_DATABASE, table]
  );

  return rows.length > 0;
}

async function readTable(conn, table) {
  if (!(await tableExists(conn, table))) return [];
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  return rows;
}

async function findAuthUserIdByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not list auth users: ${error.message}`);

    const found = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) break;

    page += 1;
  }

  return null;
}

async function ensureAuthUser(email, name) {
  const existing = await findAuthUserIdByEmail(email);
  if (existing) return existing;

  const tempPassword = `Temp-${crypto.randomBytes(10).toString("hex")}!`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });

  if (error) throw new Error(`Could not create auth user ${email}: ${error.message}`);
  return data.user.id;
}

export async function migrateMysqlToSupabase() {
  const mysqlEnv = mysqlEnvSchema.parse(process.env);

  const connection = await mysql.createConnection({
    host: mysqlEnv.MYSQL_HOST,
    port: mysqlEnv.MYSQL_PORT,
    user: mysqlEnv.MYSQL_USER,
    password: mysqlEnv.MYSQL_PASSWORD,
    database: mysqlEnv.MYSQL_DATABASE,
  });

  const summary = {
    categories: 0,
    admins: 0,
    users: 0,
    wallpapers: 0,
    wallpaper_categories: 0,
    wallpaper_likes: 0,
    notifications: 0,
    skipped: {
      usersWithoutEmail: 0,
      wallpapersWithoutUser: 0,
      linksWithoutTarget: 0,
      likesWithoutTarget: 0,
      notificationsWithoutTarget: 0,
    },
  };

  try {
    const [mysqlCategories, mysqlAdmins, mysqlUsers, mysqlWallpapers, mysqlCategoryWallpaper, mysqlWallpaperLikes, mysqlNotifications] =
      await Promise.all([
        readTable(connection, "categories"),
        readTable(connection, "admins"),
        readTable(connection, "users"),
        readTable(connection, "wallpapers"),
        readTable(connection, "category_wallpaper"),
        readTable(connection, "wallpaper_likes"),
        readTable(connection, "notifications"),
      ]);

    const mysqlCategoryById = new Map(mysqlCategories.map((row) => [row.id, row]));

    // Do not force legacy IDs into Supabase categories to avoid PK collisions.
    const categorySeedRows = mysqlCategories.map((row) => ({
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      parent_id: null,
      created_at: row.created_at,
    }));
    summary.categories = await upsertBatches("categories", categorySeedRows, "slug");

    const { data: currentCategories, error: currentCategoriesError } = await supabaseAdmin
      .from("categories")
      .select("id,slug");
    if (currentCategoriesError) {
      throw new Error(`Failed loading categories for id mapping: ${currentCategoriesError.message}`);
    }

    const categoryIdBySlug = new Map((currentCategories || []).map((row) => [row.slug, row.id]));
    const categoryIdMap = new Map();

    for (const sourceCategory of mysqlCategories) {
      const mappedId = categoryIdBySlug.get(sourceCategory.slug);
      if (mappedId) {
        categoryIdMap.set(sourceCategory.id, mappedId);
      }
    }

    // Second pass to restore parent relationships using mapped category IDs.
    for (const sourceCategory of mysqlCategories) {
      const mappedCategoryId = categoryIdMap.get(sourceCategory.id);
      if (!mappedCategoryId) continue;

      const parentCategory = sourceCategory.parent_id
        ? mysqlCategoryById.get(sourceCategory.parent_id)
        : null;
      const mappedParentId = parentCategory
        ? categoryIdBySlug.get(parentCategory.slug) || null
        : null;

      const { error: parentUpdateError } = await supabaseAdmin
        .from("categories")
        .update({ parent_id: mappedParentId })
        .eq("id", mappedCategoryId);

      if (parentUpdateError) {
        throw new Error(`Failed updating category parent for ${sourceCategory.slug}: ${parentUpdateError.message}`);
      }
    }

    const adminRows = mysqlAdmins
      .filter((row) => row.email)
      .map((row) => ({
        id: deterministicUuid("admin", row.id),
        name: row.name || row.email,
        email: row.email,
        password: row.password || "",
        is_admin: typeof row.is_admin === "number" ? row.is_admin === 1 : Boolean(row.is_admin),
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    summary.admins = await upsertBatches("admins", adminRows, "email");

    const userIdMap = new Map();
    const userRows = [];

    for (const row of mysqlUsers) {
      if (!row.email) {
        summary.skipped.usersWithoutEmail += 1;
        continue;
      }

      const authUserId = await ensureAuthUser(row.email, row.name);
      userIdMap.set(row.id, authUserId);

      userRows.push({
        id: authUserId,
        name: row.name,
        email: row.email,
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    }

    summary.users = await upsertBatches("users", userRows, "email");

    const firstUserId = userRows[0]?.id || null;
    const wallpaperIdMap = new Map();
    const wallpaperRows = [];

    for (const row of mysqlWallpapers) {
      const mappedUser = userIdMap.get(row.user_id) || firstUserId;
      if (!mappedUser) {
        summary.skipped.wallpapersWithoutUser += 1;
        continue;
      }

      const wallpaperUuid = deterministicUuid("wallpaper", row.id);
      wallpaperIdMap.set(row.id, wallpaperUuid);

      wallpaperRows.push({
        id: wallpaperUuid,
        filename: row.filename || null,
        title: row.title || row.name || row.filename || `Wallpaper ${row.id}`,
        description: row.description || null,
        image_url: row.image_url || row.github_url || row.filename || `legacy/${row.id}`,
        mime: row.mime || null,
        size: row.size || 0,
        width: row.width || 0,
        height: row.height || 0,
        category_folder: row.category_folder || null,
        storage_path: row.storage_path || row.github_url || `legacy/${row.filename || row.id}`,
        user_id: mappedUser,
        views: row.views || 0,
        likes_count: row.likes_count ?? row.likes ?? 0,
        downloads: row.downloads || 0,
        created_at: row.created_at,
      });
    }

    summary.wallpapers = await upsertBatches("wallpapers", wallpaperRows, "id");

    const categoryLinks = [];
    for (const row of mysqlCategoryWallpaper) {
      const wallpaperId = wallpaperIdMap.get(row.wallpaper_id);
      const mappedCategoryId = categoryIdMap.get(row.category_id);
      if (!wallpaperId || !mappedCategoryId) {
        summary.skipped.linksWithoutTarget += 1;
        continue;
      }

      categoryLinks.push({
        wallpaper_id: wallpaperId,
        category_id: mappedCategoryId,
      });
    }
    summary.wallpaper_categories = await upsertBatches(
      "wallpaper_categories",
      categoryLinks,
      "wallpaper_id,category_id"
    );

    const likesRows = [];
    for (const row of mysqlWallpaperLikes) {
      const wallpaperId = wallpaperIdMap.get(row.wallpaper_id);
      const userId = userIdMap.get(row.user_id);
      if (!wallpaperId || !userId) {
        summary.skipped.likesWithoutTarget += 1;
        continue;
      }

      likesRows.push({
        wallpaper_id: wallpaperId,
        user_id: userId,
        created_at: row.created_at,
      });
    }
    summary.wallpaper_likes = await upsertBatches(
      "wallpaper_likes",
      likesRows,
      "wallpaper_id,user_id"
    );

    const notificationRows = [];
    for (const row of mysqlNotifications) {
      const targetUserId = userIdMap.get(row.user_id);
      if (!targetUserId) {
        summary.skipped.notificationsWithoutTarget += 1;
        continue;
      }

      notificationRows.push({
        id: row.id,
        user_id: targetUserId,
        type: row.type || "system",
        title: row.title || "Notification",
        message: row.message || "",
        wallpaper_id: row.wallpaper_id ? wallpaperIdMap.get(row.wallpaper_id) || null : null,
        from_user_id: row.from_user_id ? userIdMap.get(row.from_user_id) || null : null,
        read: typeof row.read === "number" ? row.read === 1 : Boolean(row.read),
        created_at: row.created_at,
      });
    }

    summary.notifications = await upsertBatches("notifications", notificationRows, "id");

    return summary;
  } finally {
    await connection.end();
  }
}
