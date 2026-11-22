// Wrapper around the generated client.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://glaqcvjfziuvpjbslvpw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsYXFjdmpmeml1dnBqYnNsdnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyMDY0NzEsImV4cCI6MjExMDc4MjQ3MX0.P8rZed_CPabZ3eYjaSvW65Y-dh-iRUP1Gq16pJ_voM4";

export const supabase: any = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
export default supabase;
