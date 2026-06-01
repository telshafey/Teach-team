import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('', '.', '');
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

if(!supabaseUrl || !supabaseKey) {
  console.log("No Supabase Variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking team_members...");
  const { data: members, error: mError } = await supabase.from('team_members').select('*');
  console.log("Members:", members, "Error:", mError);
  
  console.log("Checking roles...");
  const { data: roles, error: rError } = await supabase.from('roles').select('*');
  console.log("Roles:", roles, "Error:", rError);
}

check();
