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

  try {
    // TEST 1: Forged token → expect 401
    const t1 = await fetch(`${supabaseUrl}/functions/v1/create-audit-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.forged' },
      body: JSON.stringify({ adminKey: adminCreationKey }),
    });
    const t1Body = await t1.text();
    results.push({ test: '1_forged_token', status: t1.status, body: t1Body, expected: 401, PASS: t1.status === 401 });

    // TEST 2: Anon key → expect 401
    const t2 = await fetch(`${supabaseUrl}/functions/v1/create-audit-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({ adminKey: adminCreationKey }),
    });
    const t2Body = await t2.text();
    results.push({ test: '2_anon_key', status: t2.status, body: t2Body, expected: 401, PASS: t2.status === 401 });

    // TEST 3: Real service role + valid adminKey → expect 200
    const t3 = await fetch(`${supabaseUrl}/functions/v1/create-audit-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ adminKey: adminCreationKey }),
    });
    const t3Body = await t3.text();
    const noLeak = !t3Body.includes('"credentials"') && !t3Body.includes('"password"');
    results.push({ test: '3_service_role_valid', status: t3.status, body: t3Body, expected: 200, no_credential_leak: noLeak, PASS: t3.status === 200 && noLeak });

    // Cleanup audit user if created
    try {
      const parsed = JSON.parse(t3Body);
      if (parsed?.userId) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        await supabase.auth.admin.deleteUser(parsed.userId);
        results.push({ step: 'cleanup', ok: true });
      }
    } catch { /* no-op */ }

  } catch (err) {
    results.push({ step: 'FATAL', message: (err as Error).message });
  }

  const tests = results.filter((r: any) => r.PASS !== undefined);
  const allPass = tests.length === 3 && tests.every((r: any) => r.PASS);

  return new Response(
    JSON.stringify({ ALL_PASS: allPass, results }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
