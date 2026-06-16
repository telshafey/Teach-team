const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const email = "Shimaaelsayed366@gmail.com";
  // Search for the user first
  console.log(`Looking for user ${email}...`);
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error("List users error:", listError);
    return;
  }
  
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    console.log(`User found. User ID: ${user.id}`);
    console.log("Updating password to 'Password123!' and confirming email...");
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: 'Password123!', email_confirm: true }
    );
    if (updateError) {
      console.error("Update error:", updateError);
    } else {
      console.log("Password successfully updated. User can login with 'Password123!'");
    }
  } else {
    console.log("User not found in Supabase Auth! Creating user...");
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true
    });
    if (createError) {
      console.error("Create error:", createError);
    } else {
      console.log("User successfully created. User can login with 'Password123!'");
    }
  }
}

main();
