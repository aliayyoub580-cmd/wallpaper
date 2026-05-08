import { env } from "../config/env.js";

const DEFAULT_GITHUB_IMAGE_BASE_PATH = "wallpapers";

function getGithubConfig() {
  const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO || env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || env.GITHUB_BRANCH || "main";
  const basePath = process.env.GITHUB_IMAGE_BASE_PATH || env.GITHUB_IMAGE_BASE_PATH || DEFAULT_GITHUB_IMAGE_BASE_PATH;

  return {
    token,
    owner,
    repo,
    branch,
    basePath,
  };
}

function encodeGithubPath(path) {
  return String(path)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizePathSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"|?*]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\/+/g, "/");
}

function normalizeCategoryFolder(categoryFolder) {
  return String(categoryFolder || "")
    .split("/")
    .map((segment) => normalizePathSegment(segment))
    .filter(Boolean)
    .join("/");
}

function buildStoragePath(filename, categoryFolder = "") {
  const { basePath } = getGithubConfig();
  const safeBasePath = normalizeCategoryFolder(basePath);
  const safeCategoryFolder = normalizeCategoryFolder(categoryFolder);
  const pathParts = [safeBasePath, safeCategoryFolder, normalizePathSegment(filename)].filter(Boolean);

  return pathParts.join("/");
}

function buildContentsUrl(path) {
  const { owner, repo } = getGithubConfig();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeGithubPath(path)}`;
}

function buildCdnUrl(path) {
  const { owner, repo, branch } = getGithubConfig();
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${encodeGithubPath(path)}`;
}

async function readResponseError(response) {
  const fallback = `GitHub request failed with status ${response.status}.`;

  try {
    const payload = await response.json();
    if (response.status === 401 || response.status === 403) {
      return payload?.message
        ? `GitHub rejected the upload credentials: ${payload.message}`
        : "GitHub rejected the upload credentials. Check GITHUB_TOKEN permissions for this repository.";
    }
    return payload?.message || fallback;
  } catch {
    return fallback;
  }
}

function getValidatedGithubConfig() {
  const { token, owner, repo, branch, basePath } = getGithubConfig();

  if (!token || token === "your_github_token_here") {
    return { valid: false, error: "GitHub token not configured. Set GITHUB_TOKEN in .env file." };
  }

  if (!owner) {
    return { valid: false, error: "GitHub owner not configured. Set GITHUB_OWNER in .env file." };
  }

  if (!repo) {
    return { valid: false, error: "GitHub repository not configured. Set GITHUB_REPO in .env file." };
  }

  return { valid: true, token, owner, repo, branch, basePath };
}

export function validateGithubConfig() {
  const config = getValidatedGithubConfig();
  if (!config.valid) return config;

  return {
    valid: true,
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    basePath: config.basePath,
    tokenConfigured: true,
  };
}

export function getGithubStoragePath(filename, categoryFolder = "") {
  return buildStoragePath(filename, categoryFolder);
}

export async function uploadWallpaperToGithub({
  filename,
  fileBuffer,
  categoryFolder = "",
  commitMessage,
}) {
  const config = getValidatedGithubConfig();
  if (!config.valid) {
    return { success: false, error: config.error };
  }

  const storagePath = buildStoragePath(filename, categoryFolder);
  const url = buildContentsUrl(storagePath);
  const content = Buffer.from(fileBuffer).toString("base64");
  const existingResponse = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  let sha;
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    sha = existing?.sha;
  } else if (existingResponse.status !== 404) {
    return { success: false, error: await readResponseError(existingResponse) };
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage || `Upload ${filename}`,
      content,
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    return { success: false, error: await readResponseError(response) };
  }

  return {
    success: true,
    path: storagePath,
    url: buildCdnUrl(storagePath),
    rawUrl: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encodeGithubPath(storagePath)}`,
  };
}

export async function deleteWallpaperFromGithub(filenameOrOptions, categoryFolder = "") {
  const config = getValidatedGithubConfig();
  if (!config.valid) {
    return { success: false, error: config.error };
  }

  const options = typeof filenameOrOptions === "object" && filenameOrOptions !== null
    ? filenameOrOptions
    : { filename: filenameOrOptions, categoryFolder };

  const storagePath = options.storagePath || buildStoragePath(options.filename, options.categoryFolder);
  const url = buildContentsUrl(storagePath);
  const existingResponse = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (existingResponse.status === 404) {
    return { success: true, deleted: false, path: storagePath };
  }

  if (!existingResponse.ok) {
    return { success: false, error: await readResponseError(existingResponse) };
  }

  const existing = await existingResponse.json();
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Delete ${options.filename || storagePath}`,
      sha: existing.sha,
      branch: config.branch,
    }),
  });

  if (!response.ok) {
    return { success: false, error: await readResponseError(response) };
  }

  return { success: true, deleted: true, path: storagePath };
}

export function getWallpaperUrl(filename, categoryFolder = "") {
  const config = getGithubConfig();
  const storagePath = buildStoragePath(filename, categoryFolder);
  return buildCdnUrl(storagePath || `${config.basePath}/${filename}`);
}

export function getGithubRawUrl(storagePath) {
  const config = getGithubConfig();
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encodeGithubPath(storagePath)}`;
}
