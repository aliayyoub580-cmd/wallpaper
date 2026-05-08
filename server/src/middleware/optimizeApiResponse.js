export function optimizeApiResponse(req, res, next) {
  const originalJson = res.json.bind(res);

  if (req.wantsJson || req.path.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
  }

  res.json = (payload) => {
    return originalJson(payload);
  };

  next();
}
