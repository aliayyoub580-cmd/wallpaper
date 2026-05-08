export const sessionConfig = {
  driver: process.env.SESSION_DRIVER || "memory",
  lifetime: Number(process.env.SESSION_LIFETIME || 120),
};
