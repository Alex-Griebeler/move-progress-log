import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, date } = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: 'student_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Syncing Oura data for student ${student_id}, date: ${date || 'today'}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Oura connection
    const { data: connection, error: connError } = await supabaseClient
      .from('oura_connections')
      .select('*')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      console.error('Oura connection not found:', connError);
      return new Response(
        JSON.stringify({ error: 'Conexão Oura não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let accessToken = connection.access_token;

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    if (now >= expiresAt) {
      console.log('Access token expired, refreshing...');

      const refreshResponse = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: Deno.env.get('OURA_CLIENT_ID'),
          client_secret: Deno.env.get('OURA_CLIENT_SECRET'),
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed');
        return new Response(
          JSON.stringify({ error: 'Falha ao renovar token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

      // Update tokens
      await supabaseClient
        .from('oura_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          token_expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', connection.id);

      console.log('Token refreshed successfully');
    }

    // Determine date to sync
    const syncDate = date || new Date().toISOString().split('T')[0];

    // Fetch Oura data
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const [readinessRes, sleepRes, heartrateRes] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${syncDate}T00:00:00&end_datetime=${syncDate}T23:59:59`, { headers }),
    ]);

    const readinessData = readinessRes.ok ? await readinessRes.json() : null;
    const sleepData = sleepRes.ok ? await sleepRes.json() : null;
    const heartrateData = heartrateRes.ok ? await heartrateRes.json() : null;

    console.log('Oura API responses received');

    // Extract metrics
    const readiness = readinessData?.data?.[0];
    const sleep = sleepData?.data?.[0];

    let restingHeartRate = null;
    if (heartrateData?.data && heartrateData.data.length > 0) {
      const hrValues = heartrateData.data.map((hr: any) => hr.bpm).filter((bpm: number) => bpm > 0);
      if (hrValues.length > 0) {
        restingHeartRate = Math.min(...hrValues);
      }
    }

    const metrics = {
      student_id,
      date: syncDate,
      readiness_score: readiness?.score || null,
      sleep_score: sleep?.score || null,
      hrv_balance: readiness?.contributors?.hrv_balance || null,
      resting_heart_rate: restingHeartRate,
      temperature_deviation: readiness?.contributors?.temperature_deviation || null,
      activity_balance: readiness?.contributors?.activity_balance || null,
    };

    // Upsert metrics
    const { error: upsertError } = await supabaseClient
      .from('oura_metrics')
      .upsert(metrics, { onConflict: 'student_id,date' });

    if (upsertError) {
      console.error('Failed to save metrics:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update last_sync_at
    await supabaseClient
      .from('oura_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    console.log('Oura sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        synced_metrics: metrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in oura-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
