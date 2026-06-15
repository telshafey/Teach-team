import { createClient } from "@supabase/supabase-js";

// Fetch process env manually
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const check = async () => {
    console.log("starting...");
    try {
        // Authenticate as a user!
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: "elshafey.tamer@gmail.com",
            password: "password123" // we don't know the password...
        });
        
    } catch (err: any) {
        console.error("error caught:", err.message);
    }
}
check();
