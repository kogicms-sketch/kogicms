/**
 * Execute the large SQL migration file using PostgreSQL client
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFramtzY3ZtcnFreGJ6Zmxvd3JveCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcwNTY0MzQ2LCJleHAiOjIwODYxNDAzNDZ9.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

// Create admin client (using anon key + RPC for admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function executeMigration() {
    console.log('🚀 Reading migration file...');

    const sql = readFileSync('supabase/migrations/20260211_populate_all_polling_units.sql', 'utf-8');

    console.log(`📄 Migration file size: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log('⚙️  Executing SQL migration...');

    try {
        // Execute the entire SQL as a single query
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error executing migration:', error);

            // Try alternative: execute line by line
            console.log('\\n🔄 Trying alternative approach - executing SQL directly via REST API...');

            // Use the REST API endpoint directly
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
                const error = await response.text();
                console.error('❌ REST API Error:', error);
                return;
            }

            const result = await response.json();
            console.log('✅ Migration executed via REST API');
            console.log('Result:', result);
        } else {
            console.log('✅ Migration executed successfully!');
            console.log('Result:', data);
        }

        // Verify
        console.log('\\n🔍 Verifying data...');
        const { data: count, error: countError } = await supabase
            .from('polling_units')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Error verifying:', countError);
        } else {
            console.log(`✅ Total polling units in database: ${count}`);
        }

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

executeMigration();
