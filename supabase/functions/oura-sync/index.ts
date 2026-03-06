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
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const userId = claimsData.claims.sub;

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

      console.log('Token refreshed successfully');
    }

    // Determine date to sync - CRITICAL: Calculate in user timezone (Brazil UTC-3)
    let syncDate: string;
    
    // 🔍 DETAILED TIMEZONE DEBUG LOGGING
    const nowUTC = new Date();
    console.log('🕐 === DETAILED TIMEZONE CALCULATION START ===');
    console.log('⏰ Current UTC Time:', nowUTC.toISOString());
    console.log('⏰ Current UTC Date:', nowUTC.toISOString().split('T')[0]);
    console.log('⏰ Current UTC Hours:', nowUTC.getUTCHours());
    console.log('⏰ Current UTC Minutes:', nowUTC.getUTCMinutes());
    console.log('🌎 Brazil Timezone: UTC-3 (3 hours behind UTC)');
    
    if (date) {
      // If date is provided explicitly, use it
      syncDate = date;
      console.log('📅 ✅ Using explicitly provided date:', syncDate);
      console.log('⚠️  Skipping timezone calculation (date provided by caller)');
    } else {
      // Calculate today in Brazil timezone (UTC-3)
      const brazilOffsetMinutes = 3 * 60; // Brazil is UTC-3
      const brazilOffsetMs = brazilOffsetMinutes * 60 * 1000;
      console.log('🧮 Calculating Brazil time...');
      console.log('🧮 Offset in minutes:', brazilOffsetMinutes);
      console.log('🧮 Offset in milliseconds:', brazilOffsetMs);
      console.log('🧮 UTC timestamp (ms):', nowUTC.getTime());
      
      const nowBrazil = new Date(nowUTC.getTime() - brazilOffsetMs);
      console.log('🇧🇷 Brazil Time (calculated):', nowBrazil.toISOString());
      console.log('🇧🇷 Brazil Hours:', nowBrazil.getUTCHours(), '(should be 3 hours less than UTC)');
      console.log('🇧🇷 Brazil Minutes:', nowBrazil.getUTCMinutes());
      
      syncDate = nowBrazil.toISOString().split('T')[0];
      console.log('📅 Brazil Date extracted:', syncDate);
      
      console.log('✅ TIMEZONE CALCULATION COMPLETE:', {
        utc_time_full: nowUTC.toISOString(),
        utc_date_only: nowUTC.toISOString().split('T')[0],
        brazil_time_full: nowBrazil.toISOString(),
        brazil_date_only: syncDate,
        offset_applied: '-3 hours (UTC-3)',
        calculation: `${nowUTC.getTime()} - ${brazilOffsetMs} = ${nowBrazil.getTime()}`
      });
    }
    
    console.log('🕐 === TIMEZONE CALCULATION END ===');
    console.log('');
    console.log('📅 🎯 FINAL DATE BEING SENT TO OURA API:', syncDate);
    console.log('⚠️  Remember: Oura API expects dates in user local timezone (Brazil UTC-3)');

    // Fetch Oura data
    const headers = {
      Authorization: `Bearer ${currentAccessToken}`,
    };

    console.log('🌐 API ENDPOINTS BEING CALLED:');
    console.log(`  Daily Readiness: https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${syncDate}&end_date=${syncDate}`);
    console.log(`  Daily Sleep: https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${syncDate}&end_date=${syncDate}`);
    console.log(`  Sleep Periods: https://api.ouraring.com/v2/usercollection/sleep?start_date=${syncDate}&end_date=${syncDate}`);
    console.log(`  Activity: https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${syncDate}&end_date=${syncDate}`);
    
    const [readinessRes, dailySleepRes, sleepPeriodsRes, heartrateRes, activityRes, workoutsRes, stressRes, spo2Res, vo2Res, resilienceRes] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${syncDate}T00:00:00&end_datetime=${syncDate}T23:59:59`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/workout?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/vo2_max?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${syncDate}&end_date=${syncDate}`, { headers }),
    ]);

    const readinessData = readinessRes.ok ? await readinessRes.json() : null;
    const dailySleepData = dailySleepRes.ok ? await dailySleepRes.json() : null;
    const sleepPeriodsData = sleepPeriodsRes.ok ? await sleepPeriodsRes.json() : null;
    const heartrateData = heartrateRes.ok ? await heartrateRes.json() : null;
    const activityData = activityRes.ok ? await activityRes.json() : null;
    const workoutsData = workoutsRes.ok ? await workoutsRes.json() : null;
    const stressData = stressRes.ok ? await stressRes.json() : null;
    const spo2Data = spo2Res.ok ? await spo2Res.json() : null;
    const vo2Data = vo2Res.ok ? await vo2Res.json() : null;
    const resilienceData = resilienceRes.ok ? await resilienceRes.json() : null;

    console.log('📊 Oura API responses received for date:', syncDate);
    console.log('Readiness:', {
      status: readinessRes.status,
      count: readinessData?.data?.length || 0,
      score: readinessData?.data?.[0]?.score || 'none'
    });
    console.log('Daily Sleep:', {
      status: dailySleepRes.status,
      count: dailySleepData?.data?.length || 0,
      score: dailySleepData?.data?.[0]?.score || 'none'
    });
    console.log('Sleep Periods:', {
      status: sleepPeriodsRes.status,
      count: sleepPeriodsData?.data?.length || 0,
      has_durations: !!(sleepPeriodsData?.data?.[0]?.total_sleep_duration),
      raw_response: sleepPeriodsData?.data?.length > 0 
        ? JSON.stringify(sleepPeriodsData.data[0], null, 2)
        : 'NO DATA',
      full_response: sleepPeriodsData ? JSON.stringify(sleepPeriodsData, null, 2).substring(0, 500) : 'NULL'
    });
    console.log('Activity:', {
      status: activityRes.status,
      count: activityData?.data?.length || 0,
      score: activityData?.data?.[0]?.score || 'none',
      has_steps: !!(activityData?.data?.[0]?.steps)
    });
    console.log('Heartrate:', {
      status: heartrateRes.status,
      samples: heartrateData?.data?.length || 0
    });
    console.log('Workouts:', {
      status: workoutsRes.status,
      ok: workoutsRes.ok,
      count: workoutsData?.data?.length || 0,
      raw_data: workoutsData ? JSON.stringify(workoutsData, null, 2).substring(0, 1000) : 'NULL',
      endpoint: `https://api.ouraring.com/v2/usercollection/workout?start_date=${syncDate}&end_date=${syncDate}`
    });
    console.log('Stress:', {
      status: stressRes.status,
      count: stressData?.data?.length || 0,
      has_high_time: !!(stressData?.data?.[0]?.stress_high)
    });
    
    // Log de erros da API
    if (!readinessRes.ok) console.error('❌ Readiness API error:', await readinessRes.text());
    if (!dailySleepRes.ok) console.error('❌ Daily Sleep API error:', await dailySleepRes.text());
    if (!sleepPeriodsRes.ok) console.error('❌ Sleep Periods API error:', await sleepPeriodsRes.text());
    if (!activityRes.ok) console.error('❌ Activity API error:', await activityRes.text());
    if (!heartrateRes.ok) console.error('❌ Heartrate API error:', await heartrateRes.text());
    if (!workoutsRes.ok) console.error('❌ Workouts API error:', await workoutsRes.text());

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
      // Find the longest sleep period (usually the main sleep)
      sleepPeriod = sleepPeriodsData.data.reduce((longest: any, current: any) => {
        return (current.total_sleep_duration || 0) > (longest.total_sleep_duration || 0) ? current : longest;
      });
      console.log('Selected sleep period:', {
        duration: sleepPeriod.total_sleep_duration,
        deep: sleepPeriod.deep_sleep_duration,
        rem: sleepPeriod.rem_sleep_duration,
        light: sleepPeriod.light_sleep_duration
      });
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
        console.log('Using sleep period lowest_heart_rate as fallback:', restingHeartRate);
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

    console.log('Extracted metrics:', metrics);

    // Check if all values are null (no data available)
    const hasData = metrics.readiness_score !== null || 
                    metrics.sleep_score !== null || 
                    metrics.hrv_balance !== null || 
                    metrics.resting_heart_rate !== null;

    if (!hasData) {
      console.log('⚠️ No Oura data available for date:', syncDate);
      console.log('Possible reasons:');
      console.log('1. Data not yet available (Oura processes data after sleep + sync)');
      console.log('2. User has not worn the ring on this date');
      console.log('3. Ring was not synced to the Oura app');
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Sem dados do Oura Ring para ${syncDate}. Possíveis motivos:\n\n• Os dados ainda não foram processados pelo Oura (isso acontece após dormir e sincronizar o anel)\n• O anel não foi usado nesta data\n• O anel não foi sincronizado com o app Oura\n\nTente sincronizar novamente mais tarde.`,
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
    console.log('💪 === WORKOUT PROCESSING START ===');
    console.log('Workouts API Response OK?:', workoutsRes.ok);
    console.log('Workouts Data exists?:', !!workoutsData);
    console.log('Workouts Data.data exists?:', !!workoutsData?.data);
    console.log('Workouts count:', workoutsData?.data?.length || 0);
    
    if (workoutsData?.data && workoutsData.data.length > 0) {
      console.log(`🏃 Found ${workoutsData.data.length} workouts to save`);
      
      const workouts = workoutsData.data.map((w: any, index: number) => {
        console.log(`  Workout ${index + 1}:`, {
          id: w.id,
          activity: w.activity,
          start: w.start_datetime,
          end: w.end_datetime,
          calories: w.calories,
          intensity: w.intensity
        });
        
        return {
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
        };
      });

      console.log('🔄 Attempting to upsert workouts to database...');
      const { error: workoutsError, data: insertedWorkouts } = await supabaseClient
        .from('oura_workouts')
        .upsert(workouts, { onConflict: 'student_id,oura_workout_id' })
        .select();

      if (workoutsError) {
        console.error('❌ Failed to save workouts:', {
          error: workoutsError,
          message: workoutsError.message,
          details: workoutsError.details,
          hint: workoutsError.hint
        });
      } else {
        console.log(`✅ Saved ${workouts.length} workouts successfully`);
        console.log('Inserted workout IDs:', insertedWorkouts?.map(w => w.id) || []);
      }
    } else {
      console.log('⚠️ No workouts found for this date');
      console.log('Possible reasons:');
      console.log('  - No workouts recorded in Oura app for this date');
      console.log('  - Workouts not yet synced to Oura servers');
      console.log('  - API returned empty data array');
    }
    console.log('💪 === WORKOUT PROCESSING END ===');

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
  } catch (error: any) {
    console.error('Error in oura-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
