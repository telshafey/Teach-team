import { createClient } from "@supabase/supabase-js";

async function testUpdate() {
   const supabase = createClient(
        process.env.VITE_SUPABASE_URL || "",
        process.env.VITE_SUPABASE_ANON_KEY || ""
   );
   const res = await supabase.rpc("update_member_password", {
      p_member_id: 1,
      p_new_password: "password"
   });
   console.log("Res:", res);
}
testUpdate();
