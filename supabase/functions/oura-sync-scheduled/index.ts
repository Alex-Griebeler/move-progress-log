import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Edge Function para sincronização automática do Oura Ring
 * Chamada via pg_cron 2x ao dia:
 * - 6h (horário de Brasília UTC-3) = 9h UTC
 * - 18h (horário de Brasília UTC-3) = 21h UTC
 * Aceita apenas service_role ou admin JWT.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Authentication: require service_role or admin ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // SECURITY: only accept real service role key, never JWT payload role spoofing.
    const isServiceRole = token === supabaseKey;

    if (!isServiceRole) {
      // Validate user JWT
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claimsData.claims.sub as string;
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: 'Admin privileges required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      console.log(`Admin ${userId} triggered scheduled sync`);
    }

    const body = await req.json().catch(() => ({}));
    const schedule = body.schedule || 'manual';

    console.log('🕐 === SCHEDULED OURA SYNC STARTED ===');
    console.log('Schedule:', schedule);
    console.log('Timestamp:', new Date().toISOString());

    const supabase = createClient(supabaseUrl, supabaseKey);

    // OA-03: Pass service role key as Authorization for oura-sync-all
    console.log('📞 Calling oura-sync-all function...');
    const { data, error } = await supabase.functions.invoke('oura-sync-all', {
      body: {},
      headers: { Authorization: `Bearer ${supabaseKey}` }
    });

    if (error) {
      console.error('❌ Scheduled sync failed:', error);
      throw error;
    }

    console.log('✅ Scheduled sync completed successfully');
    console.log('Results:', JSON.stringify(data, null, 2));
    console.log('🕐 === SCHEDULED OURA SYNC COMPLETED ===');

    return new Response(
      JSON.stringify({
        success: true,
        schedule,
        timestamp: new Date().toISOString(),
        ...data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Fatal error in scheduled sync:', error);
    const err = error as Error;

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
