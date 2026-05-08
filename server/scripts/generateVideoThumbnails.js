import { generateVideoThumbnails } from "../src/commands/generateVideoThumbnails.js";

try {
  const result = await generateVideoThumbnails();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
