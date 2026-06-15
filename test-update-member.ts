import { createClient } from "@supabase/supabase-js";

// Fetch process env manually
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const check = async () => {
    console.log("starting...");
    try {
        const updatePromise = supabase
            .from("team_members")
            .update({ hourly_rate: 100 })
            .eq("id", "1")
            .select()
            .single();

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
            setTimeout(() => reject(new Error("Update Request Timeout test")), 5000)
        );

        const res = await Promise.race([updatePromise, timeoutPromise]);
        console.log("res:", res);
    } catch (err: any) {
        console.error("error caught:", err.message);
    }
}
check();
