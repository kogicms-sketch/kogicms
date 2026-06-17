const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltpsylgqcwxaprsvabap.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log('Querying Katsina LGA voters by ward...');
  
  // Let's get distinct wards in Katsina LGA
  // Since we can't easily do GROUP BY count in supabase without custom RPC,
  // we can select the ward names and aggregate them locally, or select them in batches.
  // Wait, let's just query for Shinkafi A specifically:
  const { count: shinkafiACount, error: errA } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', 'KATSINA')
    .eq('ward', 'SHINKAFI \'A\''); // or 'SHINKAFI A'

  const { count: shinkafiACount2, error: errA2 } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', 'KATSINA')
    .eq('ward', 'SHINKAFI A');

  console.log('Voters in ward SHINKAFI \'A\':', shinkafiACount, 'Error:', errA?.message);
  console.log('Voters in ward SHINKAFI A:', shinkafiACount2, 'Error:', errA2?.message);

  // Let's get 50 voters from Katsina LGA to see their ward names and codes
  const { data, error } = await supabase
    .from('voter_registry')
    .select('ward, polling_unit_code, polling_unit_name')
    .eq('lga', 'KATSINA')
    .limit(50);

  if (error) {
    console.error('Error:', error);
  } else {
    const wards = [...new Set(data.map(d => d.ward))];
    console.log('Distinct wards in sample:', wards);
    console.log('Voter sample info:');
    data.slice(0, 10).forEach(v => {
      console.log(`- Ward: ${v.ward}, PU Code: ${v.polling_unit_code}, PU Name: ${v.polling_unit_name}`);
    });
  }
}

run();
