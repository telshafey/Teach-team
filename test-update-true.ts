import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'apps/web/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseKey) process.exit(1);

const client = createClient(supabaseUrl, supabaseKey);

const camelToSnakeCase = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(camelToSnakeCase);
    
    const snakeObj: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));
            // Wait, the existing camelToSnakeCase replaces back? NO! The regex in apiService is WRONG!!!
        }
    }
}

async function check() {
  const { data, error } = await client.from('site_settings').update({ app_name: 'Bokra Team Updated Test 2' }).eq('id', '1').select().single();
  console.log('Update result:', data, error);
}

check();
