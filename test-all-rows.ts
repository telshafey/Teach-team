import { createClient } from '@supabase/supabase-js';

const url = 'https://mmnubbidqwjbdrsthznx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnViYmlkcXdqYmRyc3RoepueCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwNTM2MTAxLCJleHAiOjIwNzYxMTIxMDF9.xxx'; 
// Wait, I can't do this without real key. I'll read key from .env.
// Instead of dotenv, I can just read fs and parse it.
import * as fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1];
});
const client = createClient(supabaseUrl.trim(), supabaseKey.trim());

async function check() {
  const { data, error } = await client.from('site_settings').select('*');
  console.log('ALL ROWS:', data, error);
}
check();
