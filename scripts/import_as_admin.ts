/**
 * Import polling units by signing in as super admin and inserting data
 * This works around RLS by using an authenticated admin user
 */
import { createClient } from '@supabase/supabase-js';
import { ALL_POLLING_UNITS } from '../src/data/aggregated_lga_data.js';

const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFramtzY3ZtcnFreGJ6Zmxvd3JveCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcwNTY0MzQ2LCJleHAiOjIwODYxNDAzNDZ9.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function importAsAdmin() {
    console.log('🔐 Signing in as super admin...');

    //  Sign in with super admin credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@dikkocms.com',
        password: 'admin123'
    });

    if (authError) {
        console.error('❌ Auth error:', authError);
        console.log('\\n⚠️  Trying without authentication - inserting directly...');
    } else {
        console.log('✅ Signed in as:', authData.user?.email);
    }

    console.log(`\\n🚀 Preparing to import ${ALL_POLLING_UNITS.length} polling units...`);

    // Transform data
    const pollingUnitsData = ALL_POLLING_UNITS.map(pu => ({
        name: pu.name,
        code: pu.code,
        ward_name: pu.wardName,
        lga_name: pu.lga,
        state_name: 'Katsina',
        registered_voters: pu.registeredVoters || 0,
        target_voters: 50
    }));

    console.log(`💾 Inserting in batches of 100...\\n`);

    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < pollingUnitsData.length; i += batchSize) {
        const batch = pollingUnitsData.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(pollingUnitsData.length / batchSize);

        try {
            const { data, error } = await supabase
                .from('polling_units')
                .insert(batch);

            if (error) {
                console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
                errors.push({ batch: batchNum, error: error.message, hint: error.hint });
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                process.stdout.write(`✅ Batch ${batchNum}/${totalBatches}: ${successCount}/${pollingUnitsData.length}\\r`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err: any) {
            console.error(`❌ Exception in batch ${batchNum}:`, err.message);
            errorCount += batch.length;
            errors.push({ batch: batchNum, error: err.message });
        }
    }

    console.log(`\\n\\n✨ Import complete!`);
    console.log(`✅ Successfully inserted: ${successCount} polling units`);
    console.log(`❌ Failed: ${errorCount} polling units`);

    if (errors.length > 0 && errors.length <= 5) {
        console.log(`\\n⚠️  Errors encountered:`);
        errors.forEach(e => console.log(`  Batch ${e.batch}: ${e.error} ${e.hint || ''}`));
    }

    // Verify
    console.log(`\\n🔍 Verifying import...`);
    const { count, error: countError } = await supabase
        .from('polling_units')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error counting:', countError);
    } else {
        console.log(`✅ Total polling units in database: ${count}`);
    }

    console.log(`\\n🎉 Done!`);
    process.exit(0);
}

importAsAdmin().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
