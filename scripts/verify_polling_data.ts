
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyData() {
    console.log('Verifying data...');

    // 1. Check polling_units count
    const { count: puCount, error: puError } = await supabase
        .from('polling_units')
        .select('*', { count: 'exact', head: true });

    if (puError) console.error('Error fetching polling_units:', puError);
    else console.log(`Total polling_units: ${puCount}`);

    // 2. Check polling_unit_cells count
    const { count: pucCount, error: pucError } = await supabase
        .from('polling_unit_cells')
        .select('*', { count: 'exact', head: true });

    if (pucError) console.error('Error fetching polling_unit_cells:', pucError);
    else console.log(`Total polling_unit_cells: ${pucCount}`);

    // 3. Check specific user (if known email provided, otherwise list super admins)
    // We'll search for 'super_admin' roles
    const { data: superAdmins, error: saError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('role', 'super_admin');

    if (saError) console.error('Error fetching super_admin profiles:', saError);
    else {
        console.log('Super Admins found in Profiles:', superAdmins?.length);
        superAdmins?.forEach(sa => console.log(`- ${sa.email} (ID: ${sa.id}, Role: ${sa.role})`));
    }

    // 4. Check user_roles table for super_admin
    const { data: userRoles, error: urError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'super_admin');

    if (urError) console.error('Error fetching super_admin user_roles:', urError);
    else {
        console.log('Super Admins found in User Roles:', userRoles?.length);
        userRoles?.forEach(ur => console.log(`- UserID: ${ur.user_id}, Role: ${ur.role}`));
    }
}

verifyData();
