console.log("Keys in process.env:", Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("ROLE") || k.includes("SERVICE")));
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
