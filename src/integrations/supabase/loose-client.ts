// Wrapper around the generated client.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oxpgjbynsxaabchvrrwp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGdqYnluc3hhYWJjaHZycndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDI1NzgsImV4cCI6MjEwNDI3ODU3OH0.ZCv2qd8zs3gbDgPIJDLt6L3EaktppEmyET9KphD0g3w";

export const supabase: any = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
export default supabase;
