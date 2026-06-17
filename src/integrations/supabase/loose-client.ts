// Wrapper around the generated client. This remixed project points Lovable Cloud
// at an empty backend, while the existing campaign users/data are in the legacy
// campaign backend. Keep all app imports on this loose client so auth and table
// calls use the backend that contains the real accounts, while avoiding `never`
// table typings from the generated schema.
import { createClient } from "@supabase/supabase-js";

const CAMPAIGN_SUPABASE_URL = "https://qkjscvmrqkxbzflowrox.supabase.co";
const CAMPAIGN_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34";

export const supabase: any = createClient(CAMPAIGN_SUPABASE_URL, CAMPAIGN_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
export default supabase;
