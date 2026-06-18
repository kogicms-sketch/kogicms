const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log('🚀 Reading demographics migration file...');
    const sql = fs.readFileSync('supabase/migrations/20260618_member_demographics_upgrade.sql', 'utf-8');

    console.log('🔐 Signing in as Katsina Chairman...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'katsinacms@gmail.com',
        password: 'katsina@cms'
    });

    if (authError) {
        console.error('❌ Auth error:', authError);
        return;
    }
    console.log('✅ Signed in successfully!');

    console.log('⚙️ Executing SQL migration...');
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Error executing migration via RPC:', error);
            
            console.log('\nTrying REST API directly...');
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${authData.session?.access_token}`
                },
                body: JSON.stringify({ sql_query: sql })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('❌ REST API Error:', errText);
                return;
            }

            const result = await response.json();
            console.log('✅ Migration executed via REST API');
            console.log('Result:', result);
        } else {
            console.log('✅ Migration executed successfully via RPC!');
            console.log('Result:', data);
        }
    } catch (err) {
        console.error('❌ Exception occurred:', err);
    }
}

run();
