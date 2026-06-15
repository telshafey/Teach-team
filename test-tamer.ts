import { createClient } from "@supabase/supabase-js";

async function testTamer() {
   const supabase = createClient(
        process.env.VITE_SUPABASE_URL || "",
        process.env.VITE_SUPABASE_ANON_KEY || ""
   );
   const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "elshafey.tamer@gmail.com",
      password: "password123" // we don't know the password...
   });
   console.log("Logged in:", authData, authError);
}
testTamer();
