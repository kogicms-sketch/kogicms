const { createClient } = require('@supabase/supabase-js');

const url = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(url, key);

async function run() {
  console.log('Querying voter_registry statistics...');
  
  // Get count
  const { count, error: countError } = await supabase
    .from('voter_registry')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Count Error:', countError);
    process.exit(1);
  }

  console.log('Total voters in voter_registry:', count);

  // Group by LGA and Ward to see where existing data is
  const { data: wardsData, error: wardsError } = await supabase
    .from('voter_registry')
    .select('lga, ward, polling_unit_code, polling_unit_name')
    .limit(100); // Let's just inspect some records

  if (wardsError) {
    console.error('Wards Error:', wardsError);
  } else {
    console.log('Sample records:');
    wardsData.forEach((v, index) => {
      console.log(`[${index + 1}] LGA: ${v.lga}, Ward: ${v.ward}, PU Code: ${v.polling_unit_code}, PU Name: ${v.polling_unit_name}`);
    });
  }

  // Let's search for voters in Katsina LGA
  console.log('\nQuerying voters in Katsina LGA...');
  const { data: katsinaVoters, error: katsinaError } = await supabase
    .from('voter_registry')
    .select('vin, full_name, lga, ward, polling_unit_code, polling_unit_name')
    .eq('lga', 'Katsina')
    .limit(10);

  if (katsinaError) {
    console.error('Katsina Error:', katsinaError);
  } else {
    console.log(`Found ${katsinaVoters.length} sample voters in Katsina LGA:`);
    katsinaVoters.forEach(v => {
      console.log(`- ${v.full_name} (${v.vin}) in PU: ${v.polling_unit_code} (${v.polling_unit_name}), Ward: ${v.ward}`);
    });
  }
}

run();
