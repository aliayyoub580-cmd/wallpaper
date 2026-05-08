export const queueConfig = {
  driver: process.env.QUEUE_CONNECTION || "sync",
};
