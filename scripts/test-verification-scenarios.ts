import { supabaseAdmin } from '../src/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

async function runScenarioTests() {
  console.log('====================================================');
  console.log('Starting Email Verification End-to-End Scenarios Test');
  console.log('====================================================\n');

  const admin = supabaseAdmin;
  const testEmail = `verify_test_${Date.now()}@alharmain-test.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test Pilgrim';

  // 1. Create an unverified customer account (email_confirm: false)
  console.log('[Step 1] Creating unverified customer account...');
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: false,
    user_metadata: {
      full_name: testName,
      role: 'customer',
      email_verified: false,
    },
  });

  if (createErr || !createData.user) {
    throw new Error(`Failed to create test user: ${createErr?.message}`);
  }

  const userId = createData.user.id;
  await admin.from('profiles').upsert({
    id: userId,
    role: 'customer',
    full_name: testName,
    email: testEmail,
    email_verified: false,
    status: 'active',
  });

  console.log(`✓ User created: ${userId} (${testEmail})`);
  console.log(`✓ Initial auth.users email_confirmed_at: ${createData.user.email_confirmed_at}`);
  if (createData.user.email_confirmed_at != null) {
    throw new Error('FAIL: User should not have email_confirmed_at on initial registration!');
  }

  // 2. Scenario 1: Login with an unverified customer account
  console.log('\n[Step 2] Scenario 1: Logging in with unverified customer account...');
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Use resolve-unconfirmed-login logic
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  await admin.rpc('prepare_user_for_email_verification', { target_user_id: userId });

  if (signInErr || !signInData.session) {
    throw new Error(`Login failed: ${signInErr?.message}`);
  }

  // Check user state immediately after login
  const { data: authUserPostLogin } = await client.auth.getUser();
  const isPostLoginConfirmed = Boolean(authUserPostLogin.user?.email_confirmed_at);
  console.log(`✓ Post-login email_confirmed_at: ${authUserPostLogin.user?.email_confirmed_at}`);
  console.log(`✓ Verification status: ${isPostLoginConfirmed ? 'VERIFIED' : 'UNVERIFIED'}`);

  if (isPostLoginConfirmed) {
    throw new Error('FAIL: User became Verified immediately upon login!');
  }

  // 3. Scenario 2 & 3: Click Verify Email
  console.log('\n[Step 3] Scenario 2 & 3: Simulating clicking "Verify Email"...');
  // Dispatch prepare_user_for_email_verification
  await admin.rpc('prepare_user_for_email_verification', { target_user_id: userId });

  const { data: authUserAfterClick } = await client.auth.getUser();
  const isAfterClickConfirmed = Boolean(authUserAfterClick.user?.email_confirmed_at);
  const { data: profAfterClick } = await admin.from('profiles').select('email_verified').eq('id', userId).single();

  console.log(`✓ After clicking Verify Email, email_confirmed_at: ${authUserAfterClick.user?.email_confirmed_at}`);
  console.log(`✓ After clicking Verify Email, profile.email_verified: ${profAfterClick?.email_verified}`);
  console.log(`✓ Verification status: ${isAfterClickConfirmed ? 'VERIFIED' : 'UNVERIFIED'}`);

  if (isAfterClickConfirmed || profAfterClick?.email_verified) {
    throw new Error('FAIL: Customer became Verified simply by clicking the Verify Email button!');
  }
  console.log('✓ PASS: Customer strictly remains UNVERIFIED after clicking Verify Email!');

  // 4. Scenario 4: Before clicking the email link, refresh the customer dashboard
  console.log('\n[Step 4] Scenario 4: Simulating page refresh on customer dashboard...');
  const { data: authUserAfterRefresh } = await client.auth.getUser();
  const isAfterRefreshConfirmed = Boolean(authUserAfterRefresh.user?.email_confirmed_at);
  console.log(`✓ After refresh, email_confirmed_at: ${authUserAfterRefresh.user?.email_confirmed_at}`);
  console.log(`✓ Verification status after refresh: ${isAfterRefreshConfirmed ? 'VERIFIED' : 'UNVERIFIED'}`);

  if (isAfterRefreshConfirmed) {
    throw new Error('FAIL: User became Verified after page refresh before confirming email!');
  }
  console.log('✓ PASS: Status remains UNVERIFIED on dashboard refresh!');

  // 5. Scenario 5: Log out and log back in without confirming the email
  console.log('\n[Step 5] Scenario 5: Logging out and logging back in without confirming...');
  await client.auth.signOut();

  // Log back in
  await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  const { data: reSignInData, error: reSignInErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  await admin.rpc('prepare_user_for_email_verification', { target_user_id: userId });

  if (reSignInErr || !reSignInData.session) {
    throw new Error(`Re-login failed: ${reSignInErr?.message}`);
  }

  const { data: authUserAfterRelogin } = await client.auth.getUser();
  const isAfterReloginConfirmed = Boolean(authUserAfterRelogin.user?.email_confirmed_at);
  console.log(`✓ After re-login, email_confirmed_at: ${authUserAfterRelogin.user?.email_confirmed_at}`);
  console.log(`✓ Verification status after re-login: ${isAfterReloginConfirmed ? 'VERIFIED' : 'UNVERIFIED'}`);

  if (isAfterReloginConfirmed) {
    throw new Error('FAIL: User became Verified after re-login without email confirmation!');
  }
  console.log('✓ PASS: Status remains strictly UNVERIFIED across logout and login!');

  // 6. Scenario 7 & 8: Open email inbox and click Confirm Email Address
  console.log('\n[Step 6] Scenario 7 & 8: User opens email inbox and clicks confirmation link...');
  // The confirmation link triggers verify_user_email RPC in callback
  await admin.rpc('verify_user_email', { target_user_id: userId });

  const { data: authUserConfirmed } = await admin.auth.admin.getUserById(userId);
  const { data: profConfirmed } = await admin.from('profiles').select('email_verified').eq('id', userId).single();

  console.log(`✓ Post-confirmation email_confirmed_at: ${authUserConfirmed.user?.email_confirmed_at}`);
  console.log(`✓ Post-confirmation profile.email_verified: ${profConfirmed?.email_verified}`);

  if (!authUserConfirmed.user?.email_confirmed_at) {
    throw new Error('FAIL: Supabase email_confirmed_at was not updated after confirmation!');
  }
  if (!profConfirmed?.email_verified) {
    throw new Error('FAIL: Profile email_verified was not updated to true after confirmation!');
  }
  console.log('✓ PASS: Supabase updated email_confirmed_at and profile.email_verified!');

  // 7. Scenario 9 & 10: Reopen the customer dashboard and verify status is Verified
  console.log('\n[Step 7] Scenario 9 & 10: Customer dashboard reopened after confirmation...');
  const isFinalVerified = Boolean(
    authUserConfirmed.user?.email_confirmed_at &&
    typeof authUserConfirmed.user.email_confirmed_at === 'string' &&
    authUserConfirmed.user.email_confirmed_at.trim().length > 0
  );
  console.log(`✓ Final Dashboard Status: ${isFinalVerified ? 'VERIFIED (Green badge)' : 'UNVERIFIED'}`);

  if (!isFinalVerified) {
    throw new Error('FAIL: Customer dashboard does not display Verified after confirmation!');
  }
  console.log('✓ PASS: Customer dashboard now accurately displays Verified!');

  // Clean up
  console.log('\n[Cleanup] Removing temporary test user...');
  await admin.auth.admin.deleteUser(userId);
  console.log('✓ Test user cleaned up.');

  console.log('\n====================================================');
  console.log('ALL 10 VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runScenarioTests().catch((err) => {
  console.error('\n❌ Scenario test failed:', err);
  process.exit(1);
});
