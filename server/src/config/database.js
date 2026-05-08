export const databaseConfig = {
  connection: process.env.DB_CONNECTION || "supabase",
  host: process.env.DB_HOST || null,
  port: process.env.DB_PORT || null,
  database: process.env.DB_DATABASE || null,
};
