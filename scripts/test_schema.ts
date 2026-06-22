import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase config");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Connected to Supabase.");

  const tables = [
    "leave_requests",
    "overtime_requests",
    "expense_claims",
    "work_contract_change_requests",
    "penalties"
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("count").limit(1);
    if (error) {
      console.log(`Table '${table}': FAILED (${error.message})`);
    } else {
      console.log(`Table '${table}': SUCCESS`);
    }
  }
}
main();
