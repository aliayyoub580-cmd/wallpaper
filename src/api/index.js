const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getApiUrl(path) {
  return `${API_URL}${path}`;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(getApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function apiFormRequest(path, formData, token) {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function decodeJwtPayload(token) {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch (_error) {
    return null;
  }
}

export function createUserSession(authSession, user) {
  if (!authSession?.access_token) {
    return { token: "", refreshToken: "", expiresAt: 0, user: user || null };
  }

  const decoded = decodeJwtPayload(authSession.access_token);
  const expiresAt = authSession.expires_at || decoded?.exp || 0;
  const fallbackUser = decoded
    ? {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.user_metadata?.name || decoded.user_metadata?.full_name || decoded.email,
      }
    : null;

  return {
    token: authSession.access_token,
    refreshToken: authSession.refresh_token || "",
    expiresAt,
    user: user || fallbackUser,
  };
}

export function getUserSessionExpiry(session) {
  if (session?.expiresAt) return Number(session.expiresAt);

  const decoded = decodeJwtPayload(session?.token);
  return decoded?.exp || 0;
}

export function isUserSessionExpired(session, skewSeconds = 60) {
  const expiresAt = getUserSessionExpiry(session);
  if (!expiresAt) return false;

  return expiresAt <= Math.floor(Date.now() / 1000) + skewSeconds;
}

export async function refreshUserSession(session) {
  if (!session?.refreshToken) {
    throw new Error("Your login session has expired. Please log in again.");
  }

  const data = await apiRequest("/api/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: session.refreshToken,
    }),
  });

  return createUserSession(data.session, data.user || session.user);
}

export async function getFreshUserSession(session) {
  if (!session?.token) {
    throw new Error("Please log in before uploading.");
  }

  if (!isUserSessionExpired(session)) {
    return session;
  }

  return refreshUserSession(session);
}
