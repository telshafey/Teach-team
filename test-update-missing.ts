import { createClient } from '@supabase/supabase-js';

const url = 'https://mmnubbidqwjbdrsthznx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbnViYmlkcXdqYmRyc3RoepueCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwNTM2MTAxLCJleHAiOjIwNzYxMTIxMDF9.xxx'; // wait I don't have the full key. I'll read it from test-supabase.ts.

const client = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await client.from('site_settings').update({ app_name: 'Test' }).eq('id', '2').select().single();
  console.log('Update result for non-existent row:', data, error);
}

check();
