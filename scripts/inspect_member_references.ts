import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('🔐 Logging in as Katsina LGA Chairman...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'katsinacms@gmail.com',
        password: 'katsina@cms'
    });

    if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        process.exit(1);
    }
    console.log('✅ Logged in successfully.');

    // 1. Get all polling units of Katsina LGA
    console.log('🔍 Fetching Katsina LGA polling units...');
    const { data: puData, error: puError } = await supabase
        .from('polling_units')
        .select('id, name, code, ward_name')
        .eq('lga_name', 'Katsina')
        .eq('state_name', 'Katsina');

    if (puError) {
        console.error('❌ Error fetching polling units:', puError.message);
        process.exit(1);
    }

    console.log(`Found ${puData.length} polling units for Katsina LGA.`);

    const puIds = puData.map(pu => pu.id);
    const puMap = new Map(puData.map(pu => [pu.id, pu]));

    // 2. Fetch members referencing any of these polling units
    console.log('🔍 Fetching members referencing these polling units...');
    const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, email, phone, polling_unit_id')
        .in('polling_unit_id', puIds);

    if (membersError) {
        console.error('❌ Error fetching members:', membersError.message);
        process.exit(1);
    }

    console.log(`Found ${membersData.length} members referencing Katsina LGA polling units.`);

    if (membersData.length > 0) {
        console.log('\nList of referencing members:');
        membersData.forEach(m => {
            const pu = puMap.get(m.polling_unit_id);
            console.log(`- Member: ${m.full_name} (${m.email || 'no email'})`);
            console.log(`  Phone: ${m.phone || 'no phone'}`);
            console.log(`  PU Ref: ${pu ? `${pu.name} (${pu.code}) in ${pu.ward_name}` : 'Unknown'}`);
        });
    }

    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
