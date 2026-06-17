/**
 * Split large SQL migration into batches and output SQL commands
 */
import { readFileSync, writeFileSync } from 'fs';

const sql = readFileSync('supabase/migrations/20260211_populate_all_polling_units.sql', 'utf-8');

// Find all INSERT statements
const lines = sql.split('\n');
const insertStatements: string[] = [];
let currentInsert = '';

for (const line of lines) {
    if (line.includes('INSERT INTO')) {
        if (currentInsert) {
            insertStatements.push(currentInsert);
        }
        currentInsert = line + '\n';
    } else if (currentInsert) {
        currentInsert += line + '\n';
        if (line.trim().endsWith(';')) {
            insertStatements.push(currentInsert);
            currentInsert = '';
        }
    }
}

console.log(`Found ${insertStatements.length} INSERT statements`);

// Create separate batch files (10 inserts per batch = 1000 records per batch)
const batchSize = 10;
const batches: string[][] = [];

for (let i = 0; i < insertStatements.length; i += batchSize) {
    const batch = insertStatements.slice(i, i + batchSize);
    batches.push(batch);
}

console.log(`Creating ${batches.length} batch files...`);

// Write batch files
batches.forEach((batch, index) => {
    const batchNum = index + 1;
    const content = batch.join('\n\n');
    writeFileSync(`supabase/migrations/batches/batch_${batchNum.toString().padStart(3, '0')}.sql`, content);
});

console.log(`✅ Created ${batches.length} batch files in supabase/migrations/batches/`);
console.log(`\nTo execute, run these files one by one using the Supabase MCP execute_sql tool`);
