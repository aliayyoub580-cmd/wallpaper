export const mailConfig = {
  host: process.env.MAIL_HOST || null,
  port: process.env.MAIL_PORT || null,
  username: process.env.MAIL_USERNAME || null,
  from: process.env.MAIL_FROM_ADDRESS || null,
};
