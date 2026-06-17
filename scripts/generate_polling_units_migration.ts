/**
 * Generate SQL migration to populate polling_units table from static data
 * This creates an apply_migration SQL file that can be executed via Supabase MCP
 */

import { ALL_POLLING_UNITS } from '../src/data/aggregated_lga_data.js';
import { writeFileSync } from 'fs';

console.log(`🚀 Generating SQL migration for ${ALL_POLLING_UNITS.length} polling units...`);

// Generate INSERT statements in batches
const generateInserts = () => {
    const inserts: string[] = [];

    inserts.push('-- Populate polling_units table with complete data from static files');
    inserts.push('-- This migration should be applied using Supabase migrations');
    inserts.push('');
    inserts.push('-- Temporarily disable RLS for data population');
    inserts.push('ALTER TABLE public.polling_units DISABLE ROW LEVEL SECURITY;');
    inserts.push('');
    inserts.push('-- Clear existing data');
    inserts.push('TRUNCATE TABLE public.polling_units RESTART IDENTITY CASCADE;');
    inserts.push('');
    inserts.push('-- Insert all polling units');

    // Create multi-row insert statements in batches of 100
    const batchSize = 100;
    for (let i = 0; i < ALL_POLLING_UNITS.length; i += batchSize) {
        const batch = ALL_POLLING_UNITS.slice(i, i + batchSize);

        const values = batch.map(pu => {
            const name = (pu.name || '').replace(/'/g, "''"); // Escape single quotes
            const code = (pu.code || '').replace(/'/g, "''");
            const wardName = (pu.wardName || '').replace(/'/g, "''");
            const lga = (pu.lga || '').replace(/'/g, "''");
            const voters = pu.registeredVoters || 0;

            return `('${name}', '${code}', '${wardName}', '${lga}', 'Katsina', ${voters}, 50)`;
        }).join(',\n  ');

        inserts.push(`INSERT INTO public.polling_units (name, code, ward_name, lga_name, state_name, registered_voters, target_voters) VALUES`);
        inserts.push(`  ${values};`);
        inserts.push('');
    }

    inserts.push('-- Re-enable RLS');
    inserts.push('ALTER TABLE public.polling_units ENABLE ROW LEVEL SECURITY;');
    inserts.push('');
    inserts.push('-- Verify the insert');
    inserts.push('SELECT');
    inserts.push('  lga_name,');
    inserts.push('  COUNT(*) as unit_count,');
    inserts.push('  SUM(registered_voters) as total_registered');
    inserts.push('FROM public.polling_units');
    inserts.push('GROUP BY lga_name');
    inserts.push('ORDER BY lga_name;');

    return inserts.join('\n');
};

const sql = generateInserts();

// Write to migration file
const migrationPath = 'supabase/migrations/20260211_populate_all_polling_units.sql';
writeFileSync(migrationPath, sql);

console.log(`✅ Migration file created: ${migrationPath}`);
console.log(`📊 Total polling units: ${ALL_POLLING_UNITS.length}`);
console.log(`\n🎯 Next step: Run the following command to apply the migration:`);
console.log(`   Use the Supabase MCP apply_migration tool with this file`);
