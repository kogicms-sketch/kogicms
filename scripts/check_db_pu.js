const { createClient } = require('@supabase/supabase-js');

const url = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(url, key);

async function run() {
  console.log('🔐 Logging in to legacy backend...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'katsinacms@gmail.com',
      password: 'katsina@cms'
  });

  if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
  }
  console.log('✅ Logged in successfully.');

  console.log('Querying polling units...');
  const { data, error } = await supabase
    .from('polling_units')
    .select('id, name, code, ward_name')
    .eq('lga_name', 'Katsina')
    .eq('ward_name', 'Shinkafi A')
    .order('code');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} polling units for Shinkafi A:`);
    data.forEach(pu => {
      console.log(`- ${pu.name} (${pu.code})`);
    });
  }
}

run();
