import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing admin token." });
  }

  try {
    const payload = jwt.verify(token, env.ADMIN_JWT_SECRET);
    req.adminToken = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired admin token." });
  }
}
