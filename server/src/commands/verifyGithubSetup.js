import { validateGithubConfig } from "../services/github.service.js";

export function verifyGithubSetup() {
  return validateGithubConfig();
}
