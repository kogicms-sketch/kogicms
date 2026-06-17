import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!key) {
    console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('🔐 Signing in as super admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@dikkocms.com',
      password: 'admin123'
  });

  if (authError) {
      console.error('❌ Auth error:', authError);
      process.exit(1);
  }

  console.log('✅ Signed in as:', authData.user?.email);

  // Try executing a test query via exec_sql
  const testQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: testQuery });
  console.log('exec_sql RPC result:', { data, error });

  if (error) {
    console.log('Checking alternative via REST post...');
    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${authData.session?.access_token}`
      },
      body: JSON.stringify({ sql_query: testQuery })
    });
    if (!response.ok) {
      console.error('❌ REST API failed:', await response.text());
    } else {
      console.log('✅ REST API succeeded:', await response.json());
    }
  }
}
run();
