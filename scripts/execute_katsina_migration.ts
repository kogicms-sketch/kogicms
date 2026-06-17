import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY in environment');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeKatsinaMigration() {
    console.log('🚀 Reading Katsina actual polling units migration file...');

    const migrationPath = 'supabase/migrations/20260530_katsina_actual_polling_units.sql';
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`📄 Migration file size: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log('⚙️ Executing SQL migration via RPC...');

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error executing migration via RPC:', error);

            console.log('\n🔄 Trying alternative approach - executing SQL directly via REST API...');
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ sql_query: sql })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ REST API Error:', errorText);
                return;
            }

            const result = await response.json();
            console.log('✅ Migration executed via REST API');
            console.log('Result:', result);
        } else {
            console.log('✅ Migration executed successfully!');
            console.log('Result:', data);
        }

        // Verify Katsina LGA polling units count
        console.log('\n🔍 Verifying Katsina LGA data...');
        const { data: countData, error: countError } = await supabase
            .from('polling_units')
            .select('*', { count: 'exact', head: true })
            .eq('lga_name', 'Katsina')
            .eq('state_name', 'Katsina');

        if (countError) {
            console.error('❌ Error verifying:', countError);
        } else {
            const count = countData; // When head: true, count is returned or query returns count
            console.log(`✅ Total polling units for Katsina LGA in database:`, count);
        }

        // Fetch count of polling units per ward in Katsina
        const { data: wardData, error: wardError } = await supabase
            .from('polling_units')
            .select('ward_name, name')
            .eq('lga_name', 'Katsina');

        if (wardError) {
            console.error('❌ Error fetching ward data:', wardError);
        } else if (wardData) {
            const wardCounts: Record<string, number> = {};
            wardData.forEach(pu => {
                wardCounts[pu.ward_name] = (wardCounts[pu.ward_name] || 0) + 1;
            });
            console.log('\n📊 Polling units per ward in Katsina LGA:');
            Object.entries(wardCounts).sort().forEach(([ward, count]) => {
                console.log(` - ${ward}: ${count} units`);
            });
            console.log(`\nTotal unique polling units found: ${wardData.length}`);
        }

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

executeKatsinaMigration();
