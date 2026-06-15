import { createClient } from "@supabase/supabase-js";

async function fetchRoles() {
   const supabase = createClient(
        process.env.VITE_SUPABASE_URL || "",
        process.env.VITE_SUPABASE_ANON_KEY || ""
   );
   const email = "test_test_test_" + Date.now() + "@example.com";
   const password = "password123";
   await supabase.auth.signUp({ email, password });
   
   const { data, error } = await supabase.from("roles").select("*");
   console.log("Roles:", data);
}
fetchRoles();
