import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminCreationKey = Deno.env.get('ADMIN_CREATION_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const results: Record<string, unknown>[] = [];
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const testEmail = `sectest-${Date.now()}@test.local`;
  const testPassword = 'T3st!S3cur1ty#2026';
  let testUserId = '';

  try {
    // SETUP
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email: testEmail, password: testPassword, email_confirm: true,
    });
    if (createErr || !userData.user) throw new Error(`Create failed: ${createErr?.message}`);
    testUserId = userData.user.id;

    const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    if (!loginData.access_token) throw new Error(`Login failed`);
    const userJwt = loginData.access_token;

    // TEST 1: oura-sync-all → 403
    const t1 = await fetch(`${supabaseUrl}/functions/v1/oura-sync-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userJwt}` },
      body: '{}',
    });
    const t1Body = await t1.text();
    results.push({ test: '1_oura_sync_all', status: t1.status, body: t1Body, expected: 403, PASS: t1.status === 403 });

    // TEST 2: oura-sync-scheduled → 403
    const t2 = await fetch(`${supabaseUrl}/functions/v1/oura-sync-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userJwt}` },
      body: '{}',
    });
    const t2Body = await t2.text();
    results.push({ test: '2_oura_sync_scheduled', status: t2.status, body: t2Body, expected: 403, PASS: t2.status === 403 });

    // TEST 3: create-audit-admin → 200 + no credentials/password in body
    const t3 = await fetch(`${supabaseUrl}/functions/v1/create-audit-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ adminKey: adminCreationKey }),
    });
    const t3Body = await t3.text();
    const hasCredentials = t3Body.includes('"credentials"') || t3Body.includes('"password"');
    const t3Pass = t3.status === 200 && !hasCredentials;
    results.push({
      test: '3_create_audit_admin',
      status: t3.status,
      body: t3Body,
      expected: '200 + no credentials/password',
      credentials_leaked: hasCredentials,
      PASS: t3Pass,
    });

    // Cleanup audit user
    try {
      const parsed = JSON.parse(t3Body);
      if (parsed?.userId) {
        await supabase.auth.admin.deleteUser(parsed.userId);
        results.push({ step: 'cleanup_audit_user', ok: true });
      }
    } catch { /* no-op */ }

  } catch (err) {
    results.push({ step: 'FATAL_ERROR', message: (err as Error).message });
  } finally {
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
      results.push({ step: 'cleanup_test_user', ok: true });
    }
  }

  const tests = results.filter((r: any) => r.PASS !== undefined);
  const allPass = tests.length === 3 && tests.every((r: any) => r.PASS);

  return new Response(
    JSON.stringify({ ALL_TESTS_PASS: allPass, tests_run: tests.length, results }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
