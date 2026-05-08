export const servicesConfig = {
  github: {
    token: process.env.GITHUB_TOKEN || null,
    owner: process.env.GITHUB_OWNER || null,
    repo: process.env.GITHUB_REPO || null,
    branch: process.env.GITHUB_BRANCH || "main",
  },
  facebook: {
    page_token: process.env.FACEBOOK_PAGE_TOKEN || null,
    page_id: process.env.FACEBOOK_PAGE_ID || null,
  },
};
