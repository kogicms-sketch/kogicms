import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Parse .env manually
try {
  const envPath = path.join(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
  console.log('✅ Manual .env file parsing complete');
} catch (e) {
  console.warn('⚠️ Warning: Failed to load .env file', e);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in env!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('🚀 Reading status tracking migration...');
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260613_voter_status_tracking.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('⚙️ Executing SQL migration...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error executing migration via RPC:', error);
      
      console.log('🔄 Trying via direct REST API...');
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
        const errText = await response.text();
        console.error('❌ REST API Error:', errText);
        return;
      }

      console.log('✅ Migration executed via REST API');
    } else {
      console.log('✅ Migration executed successfully via RPC!');
    }
  } catch (err) {
    console.error('❌ Exception during execution:', err);
  }
}

run();
