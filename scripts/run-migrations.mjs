import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
});

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

async function run() {
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    const { error } = await supabase.rpc("exec_sql", { sql });
    if (error) {
      console.error(`Migration ${file} failed:`, error.message);
      process.exit(1);
    }
    console.log(`Applied ${file}`);
  }
  console.log("All migrations applied.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
