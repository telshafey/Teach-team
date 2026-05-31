import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {}

const getEnv = (key: string) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  if (match) return match[1].trim();
  return process.env[key] || '';
};

const url = getEnv('VITE_SUPABASE_URL');
const key = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(url, key);

async function checkTasks() {
  const { data, error } = await supabase.from('team_members').select('*');
  console.log('MEM:', JSON.stringify(data, null, 2), error);
}

checkTasks();
