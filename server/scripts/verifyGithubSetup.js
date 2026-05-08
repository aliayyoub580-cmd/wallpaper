import { verifyGithubSetup } from "../src/commands/verifyGithubSetup.js";

const result = verifyGithubSetup();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) {
  process.exitCode = 1;
}
