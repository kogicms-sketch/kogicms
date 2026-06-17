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
  console.log('🔐 Signing in as Katsina Chairman...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'katsinacms@gmail.com',
      password: 'katsina@cms'
  });

  if (authError) {
      console.error('❌ Auth error:', authError);
      process.exit(1);
  }

  console.log('✅ Signed in as:', authData.user?.email);

  // 1. Let's query public.voter_registry directly
  console.log('Querying voter_registry...');
  const { data: voterData, error: voterError } = await supabase
    .from('voter_registry')
    .select('*')
    .limit(5);
  console.log('voterData:', voterData, 'voterError:', voterError);

  // 2. Query other tables to see if they exist
  console.log('Querying polling_units...');
  const { data: puData, error: puError } = await supabase
    .from('polling_units')
    .select('id, name')
    .limit(5);
  console.log('puData:', puData, 'puError:', puError);
}
run();
