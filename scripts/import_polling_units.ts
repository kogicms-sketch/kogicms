/**
 * Import all polling units from static data into Supabase
 * This uses the service role key to bypass RLS
 */

import { createClient } from '@supabase/supabase-js';
import { ALL_POLLING_UNITS } from '../src/data/aggregated_lga_data.js';

const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function importPollingUnits() {
    console.log(`🚀 Starting import of ${ALL_POLLING_UNITS.length} polling units...`);

    // Transform the data to match database schema
    const pollingUnitsData = ALL_POLLING_UNITS.map(pu => ({
        name: pu.name,
        code: pu.code,
        ward_name: pu.wardName,
        lga_name: pu.lga,
        state_name: 'Katsina',
        registered_voters: pu.registeredVoters || 0,
        target_voters: 50 // Default target
    }));

    console.log(`📊 Prepared ${pollingUnitsData.length} records`);
    console.log(`\n💾 Inserting into database in batches...`);

    // Insert in batches of 500 to avoid payload size limits
    const batchSize = 500;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pollingUnitsData.length; i += batchSize) {
        const batch = pollingUnitsData.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(pollingUnitsData.length / batchSize);

        try {
            const { data, error } = await supabase
                .from('polling_units')
                .insert(batch);

            if (error) {
                console.error(`❌ Error in batch ${batchNum}/${totalBatches}:`, error);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`✅ Batch ${batchNum}/${totalBatches} completed (${successCount}/${pollingUnitsData.length})`);
            }
        } catch (err) {
            console.error(`❌ Exception in batch ${batchNum}:`, err);
            errorCount += batch.length;
        }
    }

    console.log(`\n✨ Import complete!`);
    console.log(`✅ Successfully inserted: ${successCount} polling units`);
    console.log(`❌ Failed: ${errorCount} polling units`);

    // Verify the import
    console.log(`\n🔍 Verifying import...`);
    const { data: summary, error: summaryError } = await supabase
        .from('polling_units')
        .select('lga_name, registered_voters', { count: 'exact' })
        .order('lga_name');

    if (summaryError) {
        console.error('❌ Error fetching summary:', summaryError);
    } else {
        // Group by LGA
        const lgaSummary: Record<string, { count: number; voters: number }> = {};
        summary?.forEach((row: any) => {
            if (!lgaSummary[row.lga_name]) {
                lgaSummary[row.lga_name] = { count: 0, voters: 0 };
            }
            lgaSummary[row.lga_name].count++;
            lgaSummary[row.lga_name].voters += row.registered_voters || 0;
        });

        console.log(`\n📊 Summary by LGA:\n`);
        Object.entries(lgaSummary).sort(([a], [b]) => a.localeCompare(b)).forEach(([lga, stats]) => {
            console.log(`  ${lga.padEnd(20)} ${stats.count.toString().padStart(4)} units, ${stats.voters.toLocaleString().padStart(10)} voters`);
        });

        const totalUnits = Object.values(lgaSummary).reduce((sum, s) => sum + s.count, 0);
        const totalVoters = Object.values(lgaSummary).reduce((sum, s) => sum + s.voters, 0);
        console.log(`\n  ${'TOTAL'.padEnd(20)} ${totalUnits.toString().padStart(4)} units, ${totalVoters.toLocaleString().padStart(10)} voters`);
    }

    console.log(`\n🎉 All done!`);
}

// Run the import
importPollingUnits().catch(console.error);
