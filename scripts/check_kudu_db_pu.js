const { createClient } = require('@supabase/supabase-js');

const url = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(url, key);

async function run() {
  console.log('Querying Wakilin Kudu II polling units...');
  const { data, error } = await supabase
    .from('polling_units')
    .select('id, name, code, ward_name')
    .eq('lga_name', 'Katsina')
    .eq('ward_name', 'Wakilin Kudu II')
    .order('code');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} polling units for Wakilin Kudu II:`);
    data.slice(0, 5).forEach(pu => {
      console.log(`- ${pu.name} (${pu.code})`);
    });
  }

  console.log('\nQuerying voter_registry samples...');
  const { data: voters, error: vError } = await supabase
    .from('voter_registry')
    .select('vin, full_name, polling_unit_code, polling_unit_name, ward')
    .limit(5);

  if (vError) {
    console.error('Voters Error:', vError);
  } else {
    voters.forEach(v => {
      console.log(`- Voter: ${v.full_name}, PU: ${v.polling_unit_code} (${v.polling_unit_name}), Ward: ${v.ward}`);
    });
  }
}

run();
