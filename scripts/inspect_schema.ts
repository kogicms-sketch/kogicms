import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!key) {
    console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('--- Inspecting Database Schema via exec_sql ---');
  
  // 1. Query PG tables
  const queryTables = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', { sql_query: queryTables });
  console.log('Tables in public schema:', tablesData, 'Error:', tablesError);

  // 2. Check applied migrations in supabase_migrations or similar
  const queryMigrations = `
    SELECT id, name, run_at 
    FROM supabase_migrations.schema_migrations 
    ORDER BY id DESC 
    LIMIT 20;
  `;
  const { data: migData, error: migError } = await supabase.rpc('exec_sql', { sql_query: queryMigrations });
  console.log('Recent migrations applied:', migData, 'Error:', migError);
}
run();
