import { createClient } from "@supabase/supabase-js";

async function testUpdate() {
   const supabase = createClient(
        process.env.VITE_SUPABASE_URL || "",
        process.env.VITE_SUPABASE_ANON_KEY || ""
   );
   const email = "test_test_test_" + Date.now() + "@example.com";
   const password = "password123";
   await supabase.auth.signUp({ email, password });
   
   console.log("Updating team member 1...");
   // Wait, as a new user, I am NOT an admin! So I CANNOT update team_member 1 because of RLS!
   const { data: ud, error: ue } = await supabase.from("team_members").update({ salary: 1500 }).eq("id", 1).select();
   console.log("Update result:", ud, ue);
}
testUpdate();
