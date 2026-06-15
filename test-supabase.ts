import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function check() {
  const { data: s, error: sErr } = await supabase.from('site_settings').select('*');
  console.log("data:", s, "err:", sErr);
  
  const { data, error } = await supabase.from('site_settings').update({ currency: 'USD' }).eq('id', 1).select('*');
  console.log("Update Error:", error, "Data:", data);
}

check();
