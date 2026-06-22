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

  const { data, error } = await supabase.from("daily_logs").select("*");
  if (error) {
    console.error("Error fetching daily_logs:", error);
  } else {
    console.log("Number of daily_logs in DB:", data?.length);
    console.log("Sample logs:", data?.slice(0, 3));
  }
}
main();
