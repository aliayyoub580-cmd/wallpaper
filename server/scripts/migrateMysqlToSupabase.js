import { migrateMysqlToSupabase } from "../src/commands/migrateMysqlToSupabase.js";

try {
  const result = await migrateMysqlToSupabase();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
