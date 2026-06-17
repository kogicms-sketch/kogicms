
import { createClient } from '@supabase/supabase-js';

// Credentials from import_as_admin.ts
const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySecurity() {
    console.log('🛡️  Starting Security Verification...');

    // 1. Create a random test user
    const timestamp = Date.now();
    const testEmail = `security_test_${timestamp}@dikkocms.com`; // Use domain from code
    const testPassword = 'security-test-password';

    console.log(`\n👤 Creating test user: ${testEmail}...`);
    let userId: string | undefined;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
    });

    if (signUpError) {
        console.error('❌ Failed to create test user:', signUpError.message);
        console.log('⚠️  Proceeding with UN-AUTHENTICATED checks only.');
    } else {
        userId = authData.user?.id;
        if (!userId) {
            console.error('❌ User created but no ID returned (Confirmation required?).');
            console.log('⚠️  Proceeding with UN-AUTHENTICATED checks only.');
        } else {
            console.log('✅ Test user created.');
        }
    }

    // 2. Test: Can I read ALL profiles?
    // Expectation: NO. Should only see my own or limited set.
    console.log('\n🕵️  Test 1: Attempting to read ALL profiles...');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.log('✅ Access denied/Error (Good):', profileError.message);
    } else {
        const otherProfiles = profiles.filter(p => p.id !== userId);
        if (otherProfiles.length > 0) {
            console.error('❌ SECURITY FAILURE: I can see other users profiles!');
            console.error(`   Found ${otherProfiles.length} other profiles.`);
        } else {
            console.log('✅ RLS Success: I can only see my own profile (or none).');
        }
    }

    // 3. Test: Can I read ALL user_roles?
    // Expectation: NO.
    console.log('\n🕵️  Test 2: Attempting to read ALL user roles...');
    const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('*');

    if (roleError) {
        console.log('✅ Access denied/Error (Good):', roleError.message);
    } else {
        const otherRoles = roles.filter(r => r.user_id !== userId);
        if (otherRoles.length > 0) {
            console.log('⚠️  Warning: I can see other user roles. This might be intended for some logic, but check RLS.');
            console.log(`   Found ${otherRoles.length} other roles.`);
        } else {
            console.log('✅ RLS Success: I can only see my own role.');
        }
    }

    // 4. Test: Can I promote myself to Super Admin?
    // Expectation: NO.
    console.log('\n🕵️  Test 3: Attempting to privilege escalation (Insert Super Admin role)...');
    const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
            user_id: userId,
            role: 'super_admin'
        });

    if (insertError) {
        console.log('✅ Access denied (Good):', insertError.message);
    } else {
        console.error('❌ SECURITY FAILURE: I successfully promoted myself to Super Admin!');
    }

    // Cleanup
    // Note: We can't easily delete the user if RLS prevents it, but we can try.
    // In a real env we might need admin cleanup.
    console.log('\n🧹 Cleanup...');
    await supabase.auth.signOut();

    console.log('\n🏁 Verification Complete.');
}

verifySecurity().catch(console.error);
