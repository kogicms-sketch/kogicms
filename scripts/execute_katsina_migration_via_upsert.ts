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
    console.log('✅ Logged in successfully.');

    console.log('📖 Reading migration file...');
    const migrationPath = 'supabase/migrations/20260530_katsina_actual_polling_units.sql';
    const sql = readFileSync(migrationPath, 'utf-8');

    // Parse the inserts using regex
    // Format: ('Name', 'Code', 'Ward', 'Katsina', 'Katsina', registered, target)
    const regex = /'\s*([^']*?)\s*',\s*'\s*([^']*?)\s*',\s*'\s*([^']*?)\s*',\s*'\s*Katsina\s*',\s*'\s*Katsina\s*',\s*(\d+),\s*(\d+)/g;
    
    const migrationRecords: any[] = [];
    let match;
    while ((match = regex.exec(sql)) !== null) {
        migrationRecords.push({
            name: match[1],
            code: match[2],
            ward_name: match[3],
            lga_name: 'Katsina',
            state_name: 'Katsina',
            registered_voters: parseInt(match[4], 10),
            target_voters: parseInt(match[5], 10)
        });
    }

    console.log(`📊 Parsed ${migrationRecords.length} polling units from migration SQL file.`);

    if (migrationRecords.length === 0) {
        console.error('❌ Failed to parse any records from SQL file. Please check the regex or SQL structure.');
        process.exit(1);
    }

    // Step 1: Fetch all existing polling units of Katsina LGA
    console.log('🔍 Fetching existing Katsina LGA polling units...');
    const { data: existingRecords, error: fetchError } = await supabase
        .from('polling_units')
        .select('id, name, code, ward_name')
        .eq('lga_name', 'Katsina')
        .eq('state_name', 'Katsina');

    if (fetchError) {
        console.error('❌ Error fetching existing polling units:', fetchError.message);
        process.exit(1);
    }

    console.log(`Found ${existingRecords.length} existing polling units in Katsina LGA.`);

    // Map existing records by code for quick lookup
    const existingMap = new Map<string, any>();
    existingRecords.forEach(rec => {
        if (rec.code) {
            existingMap.set(rec.code.trim(), rec);
        }
    });

    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    migrationRecords.forEach(migRec => {
        const code = migRec.code.trim();
        const existing = existingMap.get(code);

        if (existing) {
            toUpdate.push({
                id: existing.id,
                ...migRec
            });
        } else {
            toInsert.push(migRec);
        }
    });

    console.log(`\n📋 Plan:`);
    console.log(`  - To Update (matches by code): ${toUpdate.length}`);
    console.log(`  - To Insert (new codes): ${toInsert.length}`);

    // Determine if there are codes to delete (present in DB but not in migration)
    const migrationCodes = new Set(migrationRecords.map(r => r.code.trim()));
    const toDelete = existingRecords.filter(rec => rec.code && !migrationCodes.has(rec.code.trim()));
    console.log(`  - To Delete (not in migration): ${toDelete.length}`);

    // Step 2: Execute Updates one by one or in small batches
    if (toUpdate.length > 0) {
        console.log(`\n🔄 Updating ${toUpdate.length} existing polling units...`);
        let updateSuccess = 0;
        let updateFail = 0;

        for (const record of toUpdate) {
            const { error: updateError } = await supabase
                .from('polling_units')
                .update({
                    name: record.name,
                    ward_name: record.ward_name,
                    registered_voters: record.registered_voters,
                    target_voters: record.target_voters,
                    updated_at: new Date().toISOString()
                })
                .eq('id', record.id);

            if (updateError) {
                console.error(`❌ Failed to update ${record.code} (${record.name}):`, updateError.message);
                updateFail++;
            } else {
                updateSuccess++;
                if (updateSuccess % 50 === 0 || updateSuccess === toUpdate.length) {
                    console.log(`  Processed update ${updateSuccess}/${toUpdate.length}...`);
                }
            }
        }
        console.log(`✅ Update complete: ${updateSuccess} succeeded, ${updateFail} failed.`);
    }

    // Step 3: Execute Inserts in batches of 50
    if (toInsert.length > 0) {
        console.log(`\n💾 Inserting ${toInsert.length} new polling units...`);
        const batchSize = 50;
        let insertSuccess = 0;

        for (let i = 0; i < toInsert.length; i += batchSize) {
            const batch = toInsert.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('polling_units')
                .insert(batch);

            if (insertError) {
                console.error(`❌ Insert batch failed:`, insertError.message);
            } else {
                insertSuccess += batch.length;
                console.log(`  Inserted batch: ${insertSuccess}/${toInsert.length}`);
            }
        }
        console.log(`✅ Insert complete: ${insertSuccess} succeeded.`);
    }

    // Step 4: Execute Deletes
    if (toDelete.length > 0) {
        console.log(`\n🗑️ Deleting ${toDelete.length} extra polling units...`);
        for (const record of toDelete) {
            // Check if referenced by members
            const { count: refCount, error: checkError } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('polling_unit_id', record.id);

            if (checkError) {
                console.error(`  ⚠️ Error checking member references for ${record.code}:`, checkError.message);
                continue;
            }

            if (refCount && refCount > 0) {
                console.warn(`  ⚠️ Skipping delete of ${record.code} (${record.name}) because it is referenced by ${refCount} members.`);
                // Alternatively, we could clear their reference, but skipping is safer unless requested
                continue;
            }

            const { error: delError } = await supabase
                .from('polling_units')
                .delete()
                .eq('id', record.id);

            if (delError) {
                console.error(`  ❌ Failed to delete ${record.code}:`, delError.message);
            } else {
                console.log(`  ✅ Deleted extra polling unit: ${record.code} (${record.name})`);
            }
        }
    }

    // Step 5: Final Verification
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
