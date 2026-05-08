import { supabaseAdmin } from "../src/lib/supabase.js";

const email = process.argv[2] || "tester@example.com";
const password = process.argv[3] || "password123";
const name = process.argv[4] || "Dev Tester";

(async () => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      process.exit(1);
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
