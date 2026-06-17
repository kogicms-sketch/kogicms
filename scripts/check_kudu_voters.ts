import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKuduVoters() {
    // Sign in as Katsina LGA Chairman to bypass RLS policies
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'katsinacms@gmail.com',
        password: 'katsina@cms'
    });

    if (authError) {
        console.error('❌ Authentication failed:', authError.message);
        process.exit(1);
    }

    const { data, error } = await supabase
        .from('polling_units')
        .select('name, code, registered_voters, target_voters')
        .eq('lga_name', 'Katsina')
        .eq('ward_name', 'Wakilin Kudu II')
        .order('code');

    if (error) {
        console.error('Error fetching Wakilin Kudu II units:', error);
    } else {
        console.log(`Found ${data?.length} polling units for Wakilin Kudu II:`);
        data?.forEach(pu => {
            console.log(`- ${pu.name} (${pu.code}): registered_voters = ${pu.registered_voters}, target_voters = ${pu.target_voters}`);
        });
    }
}

checkKuduVoters();
