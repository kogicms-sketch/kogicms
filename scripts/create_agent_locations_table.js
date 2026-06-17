const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.agent_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_name text NOT NULL,
    lga text NOT NULL,
    ward text NOT NULL,
    polling_unit_name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_locations_query ON public.agent_locations(agent_user_id, created_at DESC);

ALTER TABLE public.agent_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on agent_locations" ON public.agent_locations;
DROP POLICY IF EXISTS "Allow insert on agent_locations" ON public.agent_locations;

CREATE POLICY "Allow select on agent_locations" ON public.agent_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert on agent_locations" ON public.agent_locations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_user_id);
`;

async function run() {
  console.log('⚙️ Creating agent_locations table in Supabase via exec_sql...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error executing SQL via RPC:', error);
      
      // Fallback via HTTP REST POST
      console.log('🔄 Trying alternative approach - HTTP REST endpoint...');
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
        const err = await response.text();
        console.error('❌ REST API failed:', err);
        process.exit(1);
      }
      
      console.log('✅ Success creating agent_locations table via REST API!');
    } else {
      console.log('✅ Success creating agent_locations table via RPC!');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Exception occurred:', err);
    process.exit(1);
  }
}

run();
