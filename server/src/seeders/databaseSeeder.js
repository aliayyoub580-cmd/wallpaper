import { seedAdmin } from "./adminSeeder.js";

export async function seedDatabase() {
  await seedAdmin();
}
