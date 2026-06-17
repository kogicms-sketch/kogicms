const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltpsylgqcwxaprsvabap.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log('Querying voter_registry on project in .env:', url);
  const { count, error } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Voter registry count:', count);
  }
}

run();
