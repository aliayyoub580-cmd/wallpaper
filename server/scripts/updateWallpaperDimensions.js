import { updateWallpaperDimensions } from "../src/commands/updateWallpaperDimensions.js";

try {
  const result = await updateWallpaperDimensions();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
