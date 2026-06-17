import { readFileSync } from 'fs';
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
    console.log('✅ Logged in successfully as:', authData.user?.email);

    console.log('📖 Reading migration file...');
    const migrationPath = 'supabase/migrations/20260530_katsina_actual_polling_units.sql';
    const sql = readFileSync(migrationPath, 'utf-8');

    // Parse the inserts using regex
    // Format: ('Name', 'Code', 'Ward', 'Katsina', 'Katsina', registered, target)
    const regex = /'\s*([^']*?)\s*',\s*'\s*([^']*?)\s*',\s*'\s*([^']*?)\s*',\s*'\s*Katsina\s*',\s*'\s*Katsina\s*',\s*(\d+),\s*(\d+)/g;
    
    const records: any[] = [];
    let match;
    while ((match = regex.exec(sql)) !== null) {
        records.push({
            name: match[1],
            code: match[2],
            ward_name: match[3],
            lga_name: 'Katsina',
            state_name: 'Katsina',
            registered_voters: parseInt(match[4], 10),
            target_voters: parseInt(match[5], 10)
        });
    }

    console.log(`📊 Parsed ${records.length} polling units from migration SQL file.`);

    if (records.length === 0) {
        console.error('❌ Failed to parse any records from SQL file. Please check the regex or SQL structure.');
        process.exit(1);
    }

    // Step 1: Delete existing Katsina LGA polling units
    console.log('🗑️ Deleting existing Katsina LGA polling units...');
    const { data: delData, error: delError } = await supabase
        .from('polling_units')
        .delete()
        .eq('lga_name', 'Katsina')
        .eq('state_name', 'Katsina');

    if (delError) {
        console.error('❌ Error deleting existing records:', delError.message);
        process.exit(1);
    }
    console.log('✅ Existing Katsina LGA polling units deleted.');

    // Step 2: Insert parsed records in batches
    console.log(`💾 Inserting ${records.length} records in batches of 50...`);
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(records.length / batchSize);

        try {
            const { error: insertError } = await supabase
                .from('polling_units')
                .insert(batch);

            if (insertError) {
                console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, insertError.message);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`✅ Batch ${batchNum}/${totalBatches} inserted successfully (${successCount}/${records.length})`);
            }
            
            // Short pause
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err: any) {
            console.error(`❌ Exception in batch ${batchNum}:`, err.message || err);
            errorCount += batch.length;
        }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`✅ Successfully inserted: ${successCount} polling units`);
    console.log(`❌ Failed: ${errorCount} polling units`);

    // Verify
    console.log('\n🔍 Verifying total Katsina LGA polling units in database...');
    const { count, error: countError } = await supabase
        .from('polling_units')
        .select('*', { count: 'exact', head: true })
        .eq('lga_name', 'Katsina')
        .eq('state_name', 'Katsina');

    if (countError) {
        console.error('❌ Error verifying:', countError.message);
    } else {
        console.log(`✅ Total polling units for Katsina LGA in database: ${count}`);
    }

    // Print summary by ward
    const { data: wardData, error: wardError } = await supabase
        .from('polling_units')
        .select('ward_name')
        .eq('lga_name', 'Katsina')
        .eq('state_name', 'Katsina');

    if (wardError) {
        console.error('❌ Error fetching ward distribution:', wardError.message);
    } else if (wardData) {
        const wardCounts: Record<string, number> = {};
        wardData.forEach(pu => {
            wardCounts[pu.ward_name] = (wardCounts[pu.ward_name] || 0) + 1;
        });
        console.log('\n📊 Polling units per ward in Katsina LGA:');
        Object.entries(wardCounts).sort().forEach(([ward, count]) => {
            console.log(`  - ${ward.padEnd(20)}: ${count} units`);
        });
    }

    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
