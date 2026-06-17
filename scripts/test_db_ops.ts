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
  const { data, error } = await supabase.from('polling_units').select('id').limit(1);
  console.log('Select test:', { data, error });

  const { data: insData, error: insError } = await supabase.from('polling_units').insert({
    name: 'TEST PU',
    code: 'TEST-001',
    ward_name: 'TEST WARD',
    lga_name: 'TEST LGA',
    state_name: 'TEST STATE',
    registered_voters: 100,
    target_voters: 50
  }).select();
  console.log('Insert test:', { insData, insError });

  if (insData && insData.length > 0) {
    const { error: delError } = await supabase.from('polling_units').delete().eq('id', insData[0].id);
    console.log('Delete test error:', delError);
  }
}
run();
