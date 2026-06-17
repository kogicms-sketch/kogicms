const { createClient } = require('@supabase/supabase-js');

const url1 = 'https://ltpsylgqcwxaprsvabap.supabase.co'; // from local .env
const key1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0cHN5bGdxY3d4YXByc3ZhYmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34'; // Wait, let's load key from local .env
require('dotenv').config();

const keyEnv = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const url2 = 'https://qkjscvmrqkxbzflowrox.supabase.co'; // legacy
const key2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

async function checkProject(name, url, key) {
  const supabase = createClient(url, key);
  console.log(`\n=== Checking Project: ${name} (${url}) ===`);
  
  // Total voters
  const { count: total, error: errTotal } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true });
  
  if (errTotal) {
    console.error('Total error:', errTotal.message);
  } else {
    console.log('Total voters:', total);
  }

  // Kafur voters
  const { count: kafur, error: errKafur } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', 'KAFUR');

  if (errKafur) {
    console.error('Kafur error:', errKafur.message);
  } else {
    console.log('Kafur voters:', kafur);
  }

  // Katsina voters
  const { count: katsina, error: errKatsina } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true })
    .eq('lga', 'KATSINA');

  if (errKatsina) {
    console.error('Katsina error:', errKatsina.message);
  } else {
    console.log('Katsina voters:', katsina);
  }

  // Let's print some distinct LGAs and Wards
  const { data: lgas, error: errLgas } = await supabase
    .from('voter_registry')
    .select('lga')
    .limit(500);

  if (errLgas) {
    console.error('LGAs error:', errLgas.message);
  } else if (lgas) {
    const uniqueLgas = [...new Set(lgas.map(w => w.lga))];
    console.log('LGAs sample:', uniqueLgas);
  }
}

async function run() {
  await checkProject('Local .env Project', url1, keyEnv);
  await checkProject('Legacy Campaign Project', url2, key2);
}

run();
