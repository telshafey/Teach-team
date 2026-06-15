import { createClient } from "@supabase/supabase-js";

async function testUpdate() {
   const supabase = createClient(
        process.env.VITE_SUPABASE_URL || "",
        process.env.VITE_SUPABASE_ANON_KEY || ""
   );
   // sign up a dummy user
   const email = "test_test_test_" + Date.now() + "@example.com";
   const password = "password123";
   console.log("Signing up...");
   const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
   });
   
   if (authError) {
       console.log("Signup error", authError);
       return;
   }
   console.log("Calling is_admin...");
   // Now let's try calling an rpc or a select on team_members
   const { data: qData, error: qErr } = await supabase.from("team_members").select("*").limit(1);
   console.log("Select result:", qData, qErr);
}
testUpdate();
