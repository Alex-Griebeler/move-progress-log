import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// Mock data baseado na documentação oficial do Oura API v2
const MOCK_OURA_DATA = {
  readiness: {
    data: [{
      id: "test-readiness-1",
      day: "2025-11-03",
      score: 84,
      temperature_deviation: -0.2,
      temperature_trend_deviation: 0.1,
      timestamp: "2025-11-03T12:00:00+00:00",
      contributors: {
        activity_balance: 85,
        body_temperature: 92,
        hrv_balance: 96,
        previous_day_activity: null,
        previous_night: 88,
        recovery_index: 78,
        resting_heart_rate: 90,
        sleep_balance: 82
      }
    }]
  },
  
  dailySleep: {
    data: [{
      id: "test-daily-sleep-1",
      day: "2025-11-03",
      score: 91,
      timestamp: "2025-11-03T12:00:00+00:00",
      contributors: {
        deep_sleep: 78,
        efficiency: 90,
        latency: 85,
        rem_sleep: 88,
        restfulness: 82,
        timing: 95,
        total_sleep: 87
      }
    }]
  },
  
  sleepPeriods: {
    data: [{
      id: "test-sleep-period-1",
      average_breath: 14.5,
      average_heart_rate: 58.2,
      average_hrv: 45.3,
      awake_time: 2100,
      bedtime_end: "2025-11-03T07:30:00+00:00",
      bedtime_start: "2025-11-02T23:15:00+00:00",
      day: "2025-11-03",
      deep_sleep_duration: 5400,
      efficiency: 93,
      heart_rate: {
        interval: 300,
        items: [58, 56, 55, 54, 56, 57, 59, 60, 62],
        timestamp: "2025-11-02T23:15:00+00:00"
      },
      hrv: {
        interval: 300,
        items: [42, 45, 48, 46, 44, 43, 45, 47, 46],
        timestamp: "2025-11-02T23:15:00+00:00"
      },
      latency: 480,
      light_sleep_duration: 14400,
      low_battery_alert: false,
      lowest_heart_rate: 52,
      movement_30_sec: "<base64_encoded_data>",
      period: 0,
      readiness: {
        contributors: {
          activity_balance: 85,
          body_temperature: 92,
          hrv_balance: 88,
          previous_day_activity: null,
          previous_night: null,
          recovery_index: 78,
          resting_heart_rate: 90,
          sleep_balance: 82
        },
        score: 84,
        temperature_deviation: -0.2,
        temperature_trend_deviation: 0.1
      },
      readiness_score_delta: 0,
      rem_sleep_duration: 7200,
      restless_periods: 3,
      sleep_phase_5_min: "444444444443333333332222222222222211111111111",
      sleep_score_delta: 0,
      sleep_algorithm_version: "v2",
      time_in_bed: 29700,
      total_sleep_duration: 27000,
      type: "long_sleep"
    }]
  },
  
  activity: {
    data: [{
      id: "test-activity-1",
      class_5_min: "<base64_encoded_data>",
      score: 85,
      active_calories: 450,
      average_met_minutes: 2.5,
      contributors: {
        meet_daily_targets: 85,
        move_every_hour: 80,
        recovery_time: 90,
        stay_active: 88,
        training_frequency: 75,
        training_volume: 82
      },
      equivalent_walking_distance: 12500,
      high_activity_met_minutes: 180,
      high_activity_time: 3600,
      inactivity_alerts: 2,
      low_activity_met_minutes: 120,
      low_activity_time: 7200,
      medium_activity_met_minutes: 240,
      medium_activity_time: 4800,
      met: {
        interval: 60,
        items: [1.2, 1.5, 2.0, 2.5, 3.0, 2.8, 2.0, 1.8],
        timestamp: "2025-11-03T00:00:00+00:00"
      },
      meters_to_target: 500,
      non_wear_time: 600,
      resting_time: 28800,
      sedentary_met_minutes: 600,
      sedentary_time: 21600,
      steps: 8500,
      target_calories: 600,
      target_meters: 13000,
      total_calories: 2200,
      day: "2025-11-03",
      timestamp: "2025-11-03T12:00:00+00:00",
      training_frequency: 3,
      training_volume: 2400
    }]
  },
  
  heartrate: {
    data: Array.from({ length: 50 }, (_, i) => ({
      bpm: 55 + Math.floor(Math.random() * 30),
      source: "ring",
      timestamp: `2025-11-03T${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}:00+00:00`
    }))
  },
  
  workouts: {
    data: [{
      id: "test-workout-1",
      activity: "cycling",
      calories: 320,
      day: "2025-11-03",
      distance: 15000,
      end_datetime: "2025-11-03T08:45:00+00:00",
      intensity: "moderate",
      label: null,
      source: "manual",
      start_datetime: "2025-11-03T07:30:00+00:00",
      heart_rate: {
        average: 142,
        max: 165
      }
    }]
  },
  
  stress: {
    data: [{
      id: "test-stress-1",
      day: "2025-11-03",
      day_summary: "restored",
      stress_high: 3600,
      recovery_high: 7200,
      stress_samples: [/* array of samples */]
    }]
  },
  
  spo2: {
    data: [{
      id: "test-spo2-1",
      day: "2025-11-03",
      spo2_percentage: {
        average: 97.5
      },
      breathing_disturbance_index: 5.2
    }]
  },
  
  vo2Max: {
    data: [{
      id: "test-vo2-1",
      day: "2025-11-03",
      vo2_max: 48.5,
      timestamp: "2025-11-03T12:00:00+00:00"
    }]
  },
  
  resilience: {
    data: [{
      id: "test-resilience-1",
      day: "2025-11-03",
      level: "strong",
      contributors: {
        sleep_recovery: 85,
        daytime_recovery: 78,
        stress: 82
      }
    }]
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawPayload = await req.json().catch(() => null);
    if (!isPlainObject(rawPayload)) {
      return jsonResponse(400, { error: 'Corpo inválido' });
    }

    const student_id =
      typeof rawPayload.student_id === 'string' ? rawPayload.student_id.trim() : '';

    if (!student_id) {
      return jsonResponse(400, { error: 'student_id é obrigatório' });
    }
    if (!UUID_RE.test(student_id)) {
      return jsonResponse(400, { error: 'student_id inválido' });
    }

    // Authenticate the caller
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse(401, { error: 'Invalid or expired token' });
    }

    const userId = userData.user.id;

    // Verify trainer ownership of the student
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('trainer_id')
      .eq('id', student_id)
      .single();

    if (studentError || !student || student.trainer_id !== userId) {
      return jsonResponse(403, { error: 'Access denied: you are not this student\'s trainer' });
    }

    console.log(`🧪 TEST MODE: Processing mock Oura data for student ${student_id}`);

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const syncDate = "2025-11-03";

    // Simulate API responses with mock data
    const readinessData = MOCK_OURA_DATA.readiness;
    const dailySleepData = MOCK_OURA_DATA.dailySleep;
    const sleepPeriodsData = MOCK_OURA_DATA.sleepPeriods;
    const heartrateData = MOCK_OURA_DATA.heartrate;
    const activityData = MOCK_OURA_DATA.activity;
    const workoutsData = MOCK_OURA_DATA.workouts;
    const stressData = MOCK_OURA_DATA.stress;
    const spo2Data = MOCK_OURA_DATA.spo2;
    const vo2Data = MOCK_OURA_DATA.vo2Max;
    const resilienceData = MOCK_OURA_DATA.resilience;

    console.log('📊 Mock data loaded:');
    console.log('Readiness:', { count: readinessData?.data?.length, score: readinessData?.data?.[0]?.score });
    console.log('Daily Sleep:', { count: dailySleepData?.data?.length, score: dailySleepData?.data?.[0]?.score });
    console.log('Sleep Periods:', { 
      count: sleepPeriodsData?.data?.length,
      total_duration: sleepPeriodsData?.data?.[0]?.total_sleep_duration,
      deep: sleepPeriodsData?.data?.[0]?.deep_sleep_duration,
      rem: sleepPeriodsData?.data?.[0]?.rem_sleep_duration,
      light: sleepPeriodsData?.data?.[0]?.light_sleep_duration
    });

    // Extract metrics (same logic as oura-sync)
    const readiness = readinessData?.data?.[0];
    const dailySleep = dailySleepData?.data?.[0];
    const activity = activityData?.data?.[0];
    const stress = stressData?.data?.[0];
    const spo2 = spo2Data?.data?.[0];
    const vo2 = vo2Data?.data?.[0];
    const resilience = resilienceData?.data?.[0];

    // Process sleep periods - get longest period
    let sleepPeriod = null;
    if (sleepPeriodsData?.data && sleepPeriodsData.data.length > 0) {
      sleepPeriod = sleepPeriodsData.data.reduce((longest: Record<string, unknown>, current: Record<string, unknown>) => {
        return ((current.total_sleep_duration as number) || 0) > ((longest.total_sleep_duration as number) || 0) ? current : longest;
      });
      console.log('✅ Selected sleep period:', {
        total: sleepPeriod.total_sleep_duration,
        deep: sleepPeriod.deep_sleep_duration,
        rem: sleepPeriod.rem_sleep_duration,
        light: sleepPeriod.light_sleep_duration,
        efficiency: sleepPeriod.efficiency,
        latency: sleepPeriod.latency
      });
    }

    // Calculate resting heart rate
    let restingHeartRate = null;
    if (heartrateData?.data && heartrateData.data.length > 0) {
      const hrValues = heartrateData.data
        .map((hr: Record<string, unknown>) => hr.bpm as number)
        .filter((bpm: number) => bpm > 0 && bpm < 200);
      
      if (hrValues.length > 0) {
        const sortedValues = hrValues.sort((a: number, b: number) => a - b);
        const lowestCount = Math.max(1, Math.floor(sortedValues.length * 0.1));
        const lowestValues = sortedValues.slice(0, lowestCount);
        restingHeartRate = Math.round(lowestValues.reduce((sum: number, val: number) => sum + val, 0) / lowestValues.length);
      }
    }
    
    if (!restingHeartRate && sleepPeriod?.lowest_heart_rate) {
      restingHeartRate = sleepPeriod.lowest_heart_rate;
    }

    const metrics = {
      student_id,
      date: syncDate,
      
      // Readiness metrics
      readiness_score: readiness?.score || null,
      hrv_balance: readiness?.contributors?.hrv_balance || null,
      resting_heart_rate: restingHeartRate,
      temperature_deviation: readiness?.temperature_deviation || null,
      activity_balance: readiness?.contributors?.activity_balance || null,
      
      // Sleep score
      sleep_score: dailySleep?.score || null,
      
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

    console.log('📦 Extracted metrics:', JSON.stringify(metrics, null, 2));

    // Upsert metrics
    const { data: upsertedData, error: upsertError } = await supabaseClient
      .from('oura_metrics')
      .upsert(metrics, { onConflict: 'student_id,date' })
      .select()
      .single();

    if (upsertError) {
      console.error('❌ Failed to save metrics:', upsertError);
      return jsonResponse(500, { error: upsertError.message });
    }

    console.log('✅ Metrics saved successfully');

    // Save workouts
    if (workoutsData?.data && workoutsData.data.length > 0) {
      const workouts = workoutsData.data.map((w: Record<string, unknown>) => {
        const heartRate = w.heart_rate as Record<string, unknown> | undefined;
        return {
          student_id,
          oura_workout_id: w.id,
          activity: w.activity,
          start_datetime: w.start_datetime,
          end_datetime: w.end_datetime,
          calories: w.calories || null,
          distance: w.distance || null,
          intensity: w.intensity || null,
          average_heart_rate: heartRate?.average || null,
          max_heart_rate: heartRate?.max || null,
          source: w.source || null,
        };
      });

      const { error: workoutsError } = await supabaseClient
        .from('oura_workouts')
        .upsert(workouts, { onConflict: 'student_id,oura_workout_id' });

      if (workoutsError) {
        console.error('⚠️  Failed to save workouts:', workoutsError);
      } else {
        console.log(`✅ Saved ${workouts.length} workouts`);
      }
    }

    return jsonResponse(200, {
      success: true,
      test_mode: true,
      synced_metrics: upsertedData,
      mock_data_used: {
        readiness_score: metrics.readiness_score,
        sleep_score: metrics.sleep_score,
        total_sleep_duration: metrics.total_sleep_duration,
        deep_sleep_duration: metrics.deep_sleep_duration,
        rem_sleep_duration: metrics.rem_sleep_duration,
        light_sleep_duration: metrics.light_sleep_duration,
        sleep_efficiency: metrics.sleep_efficiency,
        resting_heart_rate: metrics.resting_heart_rate,
        hrv_balance: metrics.hrv_balance
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in oura-sync-test:', error);
    return jsonResponse(500, { error: message });
  }
});
