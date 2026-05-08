import { testFacebookPost } from "../src/commands/testFacebookPost.js";

const wallpaperId = process.argv.find((arg) => arg.startsWith("--wallpaper-id="))?.split("=")[1];

try {
  const result = await testFacebookPost(wallpaperId);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
