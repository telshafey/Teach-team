import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('', '.', '');
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log("Logging in...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'techbokra@gmail.com',
    password: 'password', // assuming the password is 'password' - I will just test if it returns an error or hangs
  });
  console.log("Login result:", data?.user?.id, error);
}

testLogin();
