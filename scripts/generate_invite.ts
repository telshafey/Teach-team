import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = process.env.ADMIN_INVITE_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const roleId = args[1];
  const adminTokenInput = args[2];

  if (!email || !roleId || !adminTokenInput) {
    console.error("Usage: npx tsx scripts/generate_invite.ts <email> <roleId> <adminToken>");
    process.exit(1);
  }

  if (!adminSecret || adminTokenInput !== adminSecret) {
    console.error("Error: Invalid ADMIN_INVITE_SECRET");
    process.exit(1);
  }

  // Generate a random token
  const token = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("invites")
    .insert([
      {
        email,
        role_id: roleId,
        token,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating invite:", error.message);
    process.exit(1);
  }

  const inviteLink = `https://bokra.vercel.app/invite?token=${token}`;
  console.log("\nInvite created successfully!");
  console.log("-----------------------------------------");
  console.log(`Email: ${email}`);
  console.log(`Role ID: ${roleId}`);
  console.log(`Invite Link: ${inviteLink}`);
  console.log("-----------------------------------------\n");
}

main();
