export const loggingConfig = {
  level: process.env.LOG_LEVEL || "info",
  channel: process.env.LOG_CHANNEL || "console",
};
