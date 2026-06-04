import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('', '.', '');
const supabaseUrl = env.VITE_SUPABASE_URL || '';
// Use SERVICE_ROLE_KEY if we have it, else try anon key (anon key won't be able to create policies, so we might fail).
// Actually, I can't create policies from the JS client with ANON KEY!
// Policies must be created via the Supabase dashboard or using postgres connection string!
