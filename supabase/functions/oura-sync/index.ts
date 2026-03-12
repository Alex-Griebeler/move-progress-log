import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Authentication: Allow service role (internal calls) OR authenticated trainer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if this is a service role call (from oura-sync-all / oura-sync-scheduled)
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Validate user JWT and check trainer ownership
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user }, error: claimsError } = await supabaseAuth.auth.getUser();
      if (claimsError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = user.id;

      // Verify the user is the trainer for this student
      const supabaseCheck = createClient(supabaseUrl, serviceRoleKey);
      const { data: student, error: studentError } = await supabaseCheck
        .from('students')
        .select('trainer_id')
        .eq('id', student_id)
        .single();

      if (studentError || !student || student.trainer_id !== userId) {
        return new Response(
          JSON.stringify({ error: 'Access denied: you are not this student\'s trainer' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    console.log(`Syncing Oura data for student ${student_id}, date: ${date || 'today'}`);

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Get Oura connection metadata
    const { data: connection, error: connError } = await supabaseClient
      .from('oura_connections')
      .select('id, student_id, token_expires_at, is_active, last_sync_at')
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

    // Retrieve decrypted access token from Vault
    const { data: accessToken, error: tokenError } = await supabaseClient
      .rpc('get_oura_access_token', { p_student_id: student_id });
    
    if (tokenError || !accessToken) {
      console.error('Failed to retrieve access token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Falha ao recuperar token de acesso' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let currentAccessToken = accessToken;

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(connection.token_expires_at);
    if (now >= expiresAt) {
      console.log('Access token expired, refreshing...');

      // Retrieve refresh token from Vault
      const { data: refreshToken, error: refreshTokenError } = await supabaseClient
        .rpc('get_oura_refresh_token', { p_student_id: student_id });
      
      if (refreshTokenError || !refreshToken) {
        console.error('Failed to retrieve refresh token:', refreshTokenError);
        return new Response(
          JSON.stringify({ error: 'Falha ao recuperar refresh token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const refreshResponse = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: Deno.env.get('OURA_CLIENT_ID') || '',
          client_secret: Deno.env.get('OURA_CLIENT_SECRET') || '',
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', {
          status: refreshResponse.status,
          error: errorText,
        });
        return new Response(
          JSON.stringify({ 
            error: 'Falha ao renovar token do Oura Ring',
            details: `Status ${refreshResponse.status}`,
            suggestion: 'Tente reconectar seu Oura Ring'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const refreshData = await refreshResponse.json();
      currentAccessToken = refreshData.access_token;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

      // Store refreshed tokens securely in Vault
      await supabaseClient.rpc('store_oura_tokens', {
        p_student_id: student_id,
        p_access_token: refreshData.access_token,
        p_refresh_token: refreshData.refresh_token,
        p_token_expires_at: newExpiresAt.toISOString(),
      });

      // O-04: Update token_expires_at in oura_connections to prevent unnecessary re-refresh
      await supabaseClient
        .from('oura_connections')
        .update({ token_expires_at: newExpiresAt.toISOString() })
        .eq('student_id', student_id);

      console.log('Token refreshed successfully');
    }

    // Determine date to sync — O-03: Use Intl.DateTimeFormat for correct Brazil timezone
    let syncDate: string;
    const DEBUG = Deno.env.get('DEBUG_OURA') === 'true';
    
    if (date) {
      syncDate = date;
      if (DEBUG) console.log('Using explicitly provided date:', syncDate);
    } else {
      // O-03: Intl.DateTimeFormat handles DST automatically
      syncDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      if (DEBUG) console.log('Calculated Brazil date:', syncDate);
    }

    // O-05: Idempotency check — skip if already synced recently
    const { data: existingMetric } = await supabaseClient
      .from('oura_metrics')
      .select('created_at')
      .eq('student_id', student_id)
      .eq('date', syncDate)
      .maybeSingle();

    if (existingMetric) {
      const lastSyncTime = new Date(existingMetric.created_at || 0).getTime();
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      if (lastSyncTime > twoHoursAgo) {
        return new Response(
          JSON.stringify({ success: true, cached: true, message: 'Dados já sincronizados nas últimas 2 horas', date: syncDate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (DEBUG) console.log('Final date for Oura API:', syncDate);

    // Fetch Oura data — O-01: Individual timeout per API call (15s)
    const headers = {
      Authorization: `Bearer ${currentAccessToken}`,
    };

    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms))
      ]);

    const OURA_TIMEOUT = 15_000;
    const apiCalls = [
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'readiness'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'daily_sleep'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'sleep_periods'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${syncDate}T00:00:00&end_datetime=${syncDate}T23:59:59`, { headers }), OURA_TIMEOUT, 'heartrate'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'activity'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/workout?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'workouts'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'stress'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'spo2'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/vo2_max?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'vo2'),
      withTimeout(fetch(`https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${syncDate}&end_date=${syncDate}`, { headers }), OURA_TIMEOUT, 'resilience'),
    ];

    const results = await Promise.allSettled(apiCalls);
    
    const safeResult = (i: number): Response | null => {
      const r = results[i];
      if (r.status === 'fulfilled') return r.value;
      console.error(`Oura API call ${i} failed:`, (r as PromiseRejectedResult).reason?.message);
      return null;
    };

    const [readinessRes, dailySleepRes, sleepPeriodsRes, heartrateRes, activityRes, workoutsRes, stressRes, spo2Res, vo2Res, resilienceRes] = 
      Array.from({ length: 10 }, (_, i) => safeResult(i));

    const safeJson = async (res: Response | null) => res && res.ok ? await res.json() : null;
    
    const [readinessData, dailySleepData, sleepPeriodsData, heartrateData, activityData, workoutsData, stressData, spo2Data, vo2Data, resilienceData] = await Promise.all([
      safeJson(readinessRes), safeJson(dailySleepRes), safeJson(sleepPeriodsRes), safeJson(heartrateRes),
      safeJson(activityRes), safeJson(workoutsRes), safeJson(stressRes), safeJson(spo2Res), safeJson(vo2Res), safeJson(resilienceRes),
    ]);

    // O-02: Conditional debug logging
    if (DEBUG) {
      console.log('Oura API responses for date:', syncDate);
      console.log('Readiness:', { count: readinessData?.data?.length || 0, score: readinessData?.data?.[0]?.score || 'none' });
      console.log('Sleep:', { count: dailySleepData?.data?.length || 0, score: dailySleepData?.data?.[0]?.score || 'none' });
      console.log('Activity:', { count: activityData?.data?.length || 0, score: activityData?.data?.[0]?.score || 'none' });
      console.log('Workouts:', { count: workoutsData?.data?.length || 0 });
    }

    // Extract metrics
    const readiness = readinessData?.data?.[0];
    const dailySleep = dailySleepData?.data?.[0];
    const activity = activityData?.data?.[0];
    const stress = stressData?.data?.[0];
    const spo2 = spo2Data?.data?.[0];
    const vo2 = vo2Data?.data?.[0];
    const resilience = resilienceData?.data?.[0];

    // Process sleep periods - get longest period or aggregate
    let sleepPeriod = null;
    if (sleepPeriodsData?.data && sleepPeriodsData.data.length > 0) {
      sleepPeriod = sleepPeriodsData.data.reduce((longest: Record<string, unknown>, current: Record<string, unknown>) => {
        return (current.total_sleep_duration || 0) > (longest.total_sleep_duration || 0) ? current : longest;
      });
      if (DEBUG) console.log('Selected sleep period:', { duration: sleepPeriod.total_sleep_duration, deep: sleepPeriod.deep_sleep_duration });
    }

    let restingHeartRate = null;
    try {
      if (heartrateData?.data && heartrateData.data.length > 0) {
        const hrValues = heartrateData.data
          .map((hr: any) => hr.bpm)
          .filter((bpm: number) => bpm > 0 && bpm < 200); // Filter valid heart rates
        
        if (hrValues.length > 0) {
          // Sort and get median of lowest 10% for more stable resting HR
          const sortedValues = hrValues.sort((a: number, b: number) => a - b);
          const lowestCount = Math.max(1, Math.floor(sortedValues.length * 0.1));
          const lowestValues = sortedValues.slice(0, lowestCount);
          restingHeartRate = Math.round(lowestValues.reduce((sum: number, val: number) => sum + val, 0) / lowestValues.length);
        }
      }
      
      // Fallback: use sleep period's lowest heart rate if available
      if (!restingHeartRate && sleepPeriod?.lowest_heart_rate) {
        restingHeartRate = sleepPeriod.lowest_heart_rate;
      }
    } catch (error) {
      console.error('Error calculating resting heart rate:', error);
      // Final fallback from sleep period data
      if (sleepPeriod?.lowest_heart_rate) {
        restingHeartRate = sleepPeriod.lowest_heart_rate;
      }
    }

    const metrics = {
      student_id,
      date: syncDate,
      
      // Existing metrics
      readiness_score: readiness?.score || null,
      sleep_score: dailySleep?.score || null,
      hrv_balance: readiness?.contributors?.hrv_balance || null,
      resting_heart_rate: restingHeartRate,
      temperature_deviation: readiness?.contributors?.temperature_deviation || null,
      activity_balance: readiness?.contributors?.activity_balance || null,
      
      // Activity metrics
      activity_score: activity?.score || null,
      steps: activity?.steps || null,
      active_calories: activity?.active_calories || null,
      total_calories: activity?.total_calories || null,
      met_minutes: activity?.equivalent_walking_distance || null,
      high_activity_time: activity?.high_activity_time || null,
      medium_activity_time: activity?.medium_activity_time || null,
      low_activity_time: activity?.low_activity_time || null,
      sedentary_time: activity?.sedentary_time || null,
      training_volume: activity?.training_volume || null,
      training_frequency: activity?.training_frequency || null,
      
      // Sleep detailed metrics from sleep periods
      total_sleep_duration: sleepPeriod?.total_sleep_duration || null,
      deep_sleep_duration: sleepPeriod?.deep_sleep_duration || null,
      rem_sleep_duration: sleepPeriod?.rem_sleep_duration || null,
      light_sleep_duration: sleepPeriod?.light_sleep_duration || null,
      awake_time: sleepPeriod?.awake_time || null,
      sleep_efficiency: sleepPeriod?.efficiency || null,
      sleep_latency: sleepPeriod?.latency || null,
      lowest_heart_rate: sleepPeriod?.lowest_heart_rate || null,
      average_sleep_hrv: sleepPeriod?.average_hrv || null,
      average_breath: sleepPeriod?.average_breath || null,
      
      // Stress metrics
      stress_high_time: stress?.stress_high || null,
      recovery_high_time: stress?.recovery_high || null,
      day_summary: stress?.day_summary || null,
      
      // SpO2 metrics
      spo2_average: spo2?.spo2_percentage?.average || null,
      breathing_disturbance_index: spo2?.breathing_disturbance_index || null,
      
      // VO2 Max
      vo2_max: vo2?.vo2_max || null,
      
      // Resilience
      resilience_level: resilience?.level || null,
    };

    if (DEBUG) console.log('Extracted metrics:', metrics);

    // Check if all values are null (no data available)
    const hasData = metrics.readiness_score !== null || 
                    metrics.sleep_score !== null || 
                    metrics.hrv_balance !== null || 
                    metrics.resting_heart_rate !== null;

    if (!hasData) {
      if (DEBUG) console.log('No Oura data available for date:', syncDate);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Sem dados do Oura Ring para ${syncDate}.`,
          synced_metrics: null,
          date: syncDate,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Save workouts
    if (workoutsData?.data && workoutsData.data.length > 0) {
      if (DEBUG) console.log(`Found ${workoutsData.data.length} workouts to save`);
      
      const workouts = workoutsData.data.map((w: any) => ({
        student_id,
        oura_workout_id: w.id,
        activity: w.activity,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        calories: w.calories || null,
        distance: w.distance || null,
        intensity: w.intensity || null,
        average_heart_rate: w.heart_rate?.average || null,
        max_heart_rate: w.heart_rate?.max || null,
        source: w.source || null,
      }));

      const { error: workoutsError } = await supabaseClient
        .from('oura_workouts')
        .upsert(workouts, { onConflict: 'student_id,oura_workout_id' });

      if (workoutsError) {
        console.error('Failed to save workouts:', workoutsError.message);
      }
    }

    // Update last_sync_at
    await supabaseClient
      .from('oura_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);

    if (DEBUG) console.log('Oura sync completed for', syncDate);

    return new Response(
      JSON.stringify({
        success: true,
        synced_metrics: metrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in oura-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
