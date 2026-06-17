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
  console.log('--- Testing voter_registry table ---');
  
  // 1. Get count of rows in voter_registry
  const { count, error: countError } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true });
  console.log('Total voters in registry:', count, 'Error:', countError);

  // 2. Query the exact VIN entered in the screenshot
  const targetVin = '90F5B13181296059968';
  const { data: vinData, error: vinError } = await supabase
    .from('voter_registry')
    .select('*')
    .eq('vin', targetVin);
  console.log(`Query for VIN ${targetVin}:`, vinData, 'Error:', vinError);

  // 3. Query the same VIN with possible character swaps (like letter 'O' instead of digit '0' or vice-versa)
  // Let's do a wildcard search or prefix search
  const prefix = targetVin.slice(0, 8);
  const { data: prefixData, error: prefixError } = await supabase
    .from('voter_registry')
    .select('*')
    .ilike('vin', `%${prefix}%`)
    .limit(10);
  console.log(`Query for VIN containing prefix ${prefix}:`, prefixData, 'Error:', prefixError);

  // 4. Print 5 sample rows from the registry to see correct format
  const { data: sampleData, error: sampleError } = await supabase
    .from('voter_registry')
    .select('*')
    .limit(5);
  console.log('Sample rows:', sampleData, 'Error:', sampleError);
}
run();
