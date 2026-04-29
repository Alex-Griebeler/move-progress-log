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
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'number' ? item : Number(item)))
    .filter((num) => Number.isFinite(num));
};

const computeStats = (values: number[]) => {
  if (values.length === 0) {
    return {
      min: null as number | null,
      max: null as number | null,
      last: null as number | null,
      avg: null as number | null,
      stddev: null as number | null,
      count: 0,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const last = values[values.length - 1];
  const avg = values.reduce((sum, current) => sum + current, 0) / values.length;
  const variance = values.reduce((sum, current) => sum + Math.pow(current - avg, 2), 0) / values.length;

  return {
    min,
    max,
    last,
    avg,
    stddev: Math.sqrt(variance),
    count: values.length,
  };
};

const mergePreservingExisting = (
  incoming: Record<string, unknown>,
  existing: Record<string, unknown> | null
): Record<string, unknown> => {
  if (!existing) return incoming;

  const merged: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = value ?? existing[key] ?? null;
  }
  return merged;
};

const hasAnyMetricValue = (metrics: Record<string, unknown>): boolean =>
  Object.entries(metrics).some(([key, value]) => {
    if (key === "student_id" || key === "date") return false;
    return value !== null && value !== undefined;
  });

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const isUnauthorizedStatus = (status: number): boolean =>
  status === 401 || status === 403;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const ouraClientId = Deno.env.get('OURA_CLIENT_ID') ?? '';
    const ouraClientSecret = Deno.env.get('OURA_CLIENT_SECRET') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse(500, {
        error: 'Configuração incompleta do backend',
        details: 'Variáveis SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY ausentes.',
      });
    }

    // Authenticate first: Allow service role (internal calls) OR authenticated trainer
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return jsonResponse(401, { error: 'Unauthorized' });
    }

    const isServiceRole = token === serviceRoleKey;

    const rawPayload = await req.json().catch(() => null);
    if (!isPlainObject(rawPayload)) {
      return jsonResponse(400, { error: 'Corpo inválido' });
    }

    const student_id =
      typeof rawPayload.student_id === 'string' ? rawPayload.student_id.trim() : '';
    const date = typeof rawPayload.date === 'string' ? rawPayload.date.trim() : undefined;
    const forceSyncRaw = rawPayload.force_sync;
    const force_sync =
      forceSyncRaw === true ||
      (typeof forceSyncRaw === 'string' && forceSyncRaw.toLowerCase() === 'true');

    if (!student_id) {
      return jsonResponse(400, { error: 'student_id é obrigatório' });
    }
    if (!UUID_RE.test(student_id)) {
      return jsonResponse(400, { error: 'student_id inválido' });
    }
    if (date && !DATE_RE.test(date)) {
      return jsonResponse(400, { error: 'date deve estar no formato YYYY-MM-DD' });
    }

    if (!isServiceRole) {
      // Validate user JWT, then allow admin role OR trainer ownership
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user }, error: claimsError } = await supabaseAuth.auth.getUser();
      if (claimsError || !user) {
        return jsonResponse(401, { error: 'Invalid or expired token' });
      }

      const userId = user.id;
      const supabaseCheck = createClient(supabaseUrl, serviceRoleKey);

      // Admin users can sync any student (same behavior as oura-sync-all)
      const { data: adminRole, error: roleError } = await supabaseCheck
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (roleError) {
        return jsonResponse(500, { error: 'Failed to verify permissions' });
      }

      const isAdmin = Boolean(adminRole);
      if (!isAdmin) {
        // Non-admin users can only sync students they own as trainer
        const { data: student, error: studentError } = await supabaseCheck
          .from('students')
          .select('trainer_id')
          .eq('id', student_id)
          .single();

        if (studentError || !student || student.trainer_id !== userId) {
          return jsonResponse(403, { error: 'Access denied: you are not this student\'s trainer' });
        }
      }
    }

    console.log(
      `Syncing Oura data for student ${student_id}, date: ${date || 'today'}, force_sync: ${force_sync}`
    );

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
      return jsonResponse(404, { error: 'Conexão Oura não encontrada' });
    }

    // Retrieve decrypted access token from Vault
    const { data: accessToken, error: tokenError } = await supabaseClient
      .rpc('get_oura_access_token', { p_student_id: student_id });
    
    if (tokenError || !accessToken) {
      console.error('Failed to retrieve access token:', tokenError);
      return jsonResponse(500, { error: 'Falha ao recuperar token de acesso' });
    }

    let currentAccessToken = accessToken;

    // Check if token expired
    const nowMs = Date.now();
    const tokenExpiresAtMs =
      typeof connection.token_expires_at === 'string'
        ? Date.parse(connection.token_expires_at)
        : Number.NaN;
    const refreshSkewMs = 60_000; // 1 min de margem para evitar expiração durante requisição

    if (!Number.isFinite(tokenExpiresAtMs) || nowMs + refreshSkewMs >= tokenExpiresAtMs) {
      console.log('Access token expired, refreshing...');

      // Retrieve refresh token from Vault
      const { data: refreshToken, error: refreshTokenError } = await supabaseClient
        .rpc('get_oura_refresh_token', { p_student_id: student_id });
      
      if (refreshTokenError || !refreshToken) {
        console.error('Failed to retrieve refresh token:', refreshTokenError);
        return jsonResponse(500, { error: 'Falha ao recuperar refresh token' });
      }

      if (!ouraClientId || !ouraClientSecret) {
        return jsonResponse(500, {
          error: 'Configuração incompleta do Oura Ring',
          details: 'Variáveis OURA_CLIENT_ID/OURA_CLIENT_SECRET ausentes.',
          suggestion: 'Configure os segredos e tente novamente.',
        });
      }

      const refreshResponse = await fetch('https://api.ouraring.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: ouraClientId,
          client_secret: ouraClientSecret,
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
          { headers: jsonHeaders, status: 401 }
        );
      }

      const refreshData = await refreshResponse.json();
      const refreshedAccessToken =
        isPlainObject(refreshData) && typeof refreshData.access_token === 'string'
          ? refreshData.access_token
          : '';
      const expiresInSeconds =
        isPlainObject(refreshData) && typeof refreshData.expires_in === 'number'
          ? refreshData.expires_in
          : Number(isPlainObject(refreshData) ? refreshData.expires_in : Number.NaN);
      const nextRefreshToken =
        isPlainObject(refreshData) &&
        typeof refreshData.refresh_token === 'string' &&
        refreshData.refresh_token.length > 0
          ? refreshData.refresh_token
          : refreshToken;

      if (!refreshedAccessToken || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
        console.error('Token refresh response is missing required fields');
        return jsonResponse(502, {
          error: 'Resposta inválida ao renovar token do Oura Ring',
          suggestion: 'Tente reconectar o Oura Ring do aluno',
        });
      }

      currentAccessToken = refreshedAccessToken;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + expiresInSeconds);

      // Store refreshed tokens securely in Vault
      const { error: storeTokenError } = await supabaseClient.rpc('store_oura_tokens', {
        p_student_id: student_id,
        p_access_token: refreshedAccessToken,
        p_refresh_token: nextRefreshToken,
        p_token_expires_at: newExpiresAt.toISOString(),
      });
      if (storeTokenError) {
        console.error('Failed to persist refreshed Oura tokens:', storeTokenError);
        return jsonResponse(500, { error: 'Falha ao persistir tokens renovados do Oura Ring' });
      }

      // O-04: Update token_expires_at in oura_connections to prevent unnecessary re-refresh
      const { error: updateExpiresError } = await supabaseClient
        .from('oura_connections')
        .update({ token_expires_at: newExpiresAt.toISOString() })
        .eq('student_id', student_id);
      if (updateExpiresError) {
        console.error('Failed to update token_expires_at after refresh:', updateExpiresError);
        return jsonResponse(500, { error: 'Falha ao atualizar expiração do token Oura Ring' });
      }

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

    // O-05: Idempotency check — skip if already synced recently (unless force_sync=true)
    if (!force_sync) {
      const { data: existingMetric, error: existingMetricError } = await supabaseClient
        .from('oura_metrics')
        .select('created_at')
        .eq('student_id', student_id)
        .eq('date', syncDate)
        .maybeSingle();

      if (existingMetricError) {
        console.warn('Idempotency check failed (continuing sync):', existingMetricError.message);
      }

      if (!existingMetricError && existingMetric) {
        const metricCreatedAtMs = new Date(existingMetric.created_at || 0).getTime();
        const connectionLastSyncMs =
          typeof connection.last_sync_at === 'string'
            ? Date.parse(connection.last_sync_at)
            : Number.NaN;
        const lastSyncTime = Math.max(
          Number.isFinite(metricCreatedAtMs) ? metricCreatedAtMs : 0,
          Number.isFinite(connectionLastSyncMs) ? connectionLastSyncMs : 0
        );
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        if (lastSyncTime > twoHoursAgo) {
          return new Response(
            JSON.stringify({
              success: true,
              cached: true,
              message: 'Dados já sincronizados nas últimas 2 horas',
              date: syncDate,
            }),
            { headers: jsonHeaders }
          );
        }
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
    const endpointNames = [
      'readiness',
      'daily_sleep',
      'sleep_periods',
      'heartrate',
      'activity',
      'workouts',
      'stress',
      'spo2',
      'vo2',
      'resilience',
    ] as const;

    const warnings: string[] = [];

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
      const endpointName = endpointNames[i] ?? `endpoint-${i}`;
      console.error(`Oura API call ${endpointName} failed:`, (r as PromiseRejectedResult).reason?.message);
      warnings.push(`Falha de comunicação no endpoint ${endpointName}.`);
      return null;
    };

    const [readinessRes, dailySleepRes, sleepPeriodsRes, heartrateRes, activityRes, workoutsRes, stressRes, spo2Res, vo2Res, resilienceRes] =
      Array.from({ length: 10 }, (_, i) => safeResult(i));

    const endpointStatuses = [
      { name: 'readiness', response: readinessRes },
      { name: 'daily_sleep', response: dailySleepRes },
      { name: 'sleep_periods', response: sleepPeriodsRes },
      { name: 'heartrate', response: heartrateRes },
      { name: 'activity', response: activityRes },
      { name: 'workouts', response: workoutsRes },
      { name: 'stress', response: stressRes },
      { name: 'spo2', response: spo2Res },
      { name: 'vo2', response: vo2Res },
      { name: 'resilience', response: resilienceRes },
    ];

    const unauthorizedEndpoints = endpointStatuses
      .filter((item) => item.response && isUnauthorizedStatus(item.response.status))
      .map((item) => item.name);

    if (unauthorizedEndpoints.length > 0) {
      return jsonResponse(401, {
        error: 'Falha de autenticação com a API do Oura Ring',
        details: `Endpoints com 401/403: ${unauthorizedEndpoints.join(', ')}`,
        suggestion: 'Reconecte o Oura Ring do aluno para renovar as credenciais.',
      });
    }

    const successfulEndpoints = endpointStatuses.filter(
      (item) => item.response && item.response.ok
    );
    if (successfulEndpoints.length === 0) {
      return jsonResponse(502, {
        error: 'Falha ao consultar a API do Oura Ring',
        details: 'Nenhum endpoint retornou sucesso.',
      });
    }

    const degradedEndpoints = endpointStatuses
      .filter((item) => item.response && !item.response.ok)
      .map((item) => `${item.name} (${item.response?.status})`);
    if (degradedEndpoints.length > 0) {
      warnings.push(`Endpoints com resposta não-OK: ${degradedEndpoints.join(', ')}.`);
    }

    const safeJson = async (res: Response | null, endpointName: string) => {
      if (!res || !res.ok) return null;
      try {
        return await res.json();
      } catch (error) {
        const warningMessage = `Resposta JSON inválida no endpoint ${endpointName}.`;
        warnings.push(warningMessage);
        if (DEBUG) console.warn(warningMessage, error);
        return null;
      }
    };
    
    const [readinessData, dailySleepData, sleepPeriodsData, heartrateData, activityData, workoutsData, stressData, spo2Data, vo2Data, resilienceData] = await Promise.all([
      safeJson(readinessRes, 'daily_readiness'),
      safeJson(dailySleepRes, 'daily_sleep'),
      safeJson(sleepPeriodsRes, 'sleep'),
      safeJson(heartrateRes, 'heartrate'),
      safeJson(activityRes, 'daily_activity'),
      safeJson(workoutsRes, 'workout'),
      safeJson(stressRes, 'daily_stress'),
      safeJson(spo2Res, 'daily_spo2'),
      safeJson(vo2Res, 'vO2_max'),
      safeJson(resilienceRes, 'daily_resilience'),
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
    const hasWorkoutsData = Array.isArray(workoutsData?.data) && workoutsData.data.length > 0;

    // Process sleep periods - get longest period or aggregate
    let sleepPeriod = null;
    if (sleepPeriodsData?.data && sleepPeriodsData.data.length > 0) {
      sleepPeriod = sleepPeriodsData.data.reduce((longest: Record<string, unknown>, current: Record<string, unknown>) => {
        return ((current.total_sleep_duration as number) || 0) > ((longest.total_sleep_duration as number) || 0) ? current : longest;
      });
      if (DEBUG) console.log('Selected sleep period:', { duration: sleepPeriod.total_sleep_duration, deep: sleepPeriod.deep_sleep_duration });
    }

    let restingHeartRate = null;
    try {
      if (heartrateData?.data && heartrateData.data.length > 0) {
        const hrValues = heartrateData.data
          .map((hr: Record<string, unknown>) => hr.bpm as number)
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

    const sleepPeriodObj = isPlainObject(sleepPeriod) ? sleepPeriod : null;
    const sleepHrvObj =
      sleepPeriodObj && isPlainObject(sleepPeriodObj.hrv) ? sleepPeriodObj.hrv : null;
    const sleepHrObj =
      sleepPeriodObj && isPlainObject(sleepPeriodObj.heart_rate) ? sleepPeriodObj.heart_rate : null;

    const sleepHrvValues = toNumberArray(sleepHrvObj?.items);
    const sleepHrValues = toNumberArray(sleepHrObj?.items);
    const dayHrSamples = Array.isArray(heartrateData?.data)
      ? heartrateData.data
          .filter(isPlainObject)
          .map((hr: Record<string, unknown>) => {
            const bpm = typeof hr.bpm === 'number' ? hr.bpm : Number(hr.bpm);
            const timestamp = typeof hr.timestamp === 'string' ? hr.timestamp : null;
            const source = typeof hr.source === 'string' ? hr.source : null;
            return { bpm, timestamp, source };
          })
          .filter((sample: { bpm: number }) => Number.isFinite(sample.bpm))
      : [];
    const dayHrValues = dayHrSamples.map((sample: { bpm: number }) => sample.bpm);

    const hrvStats = computeStats(sleepHrvValues);
    const hrNightStats = computeStats(sleepHrValues);
    const hrDayStats = computeStats(dayHrValues);

    const sleepHrvSeries =
      sleepHrvObj && sleepHrvValues.length > 0
        ? {
            interval_seconds:
              typeof sleepHrvObj.interval === 'number' ? sleepHrvObj.interval : null,
            start_timestamp:
              typeof sleepHrvObj.timestamp === 'string' ? sleepHrvObj.timestamp : null,
            values: sleepHrvValues,
          }
        : null;

    const sleepHrSeries =
      sleepHrObj && sleepHrValues.length > 0
        ? {
            interval_seconds:
              typeof sleepHrObj.interval === 'number' ? sleepHrObj.interval : null,
            start_timestamp:
              typeof sleepHrObj.timestamp === 'string' ? sleepHrObj.timestamp : null,
            values: sleepHrValues,
          }
        : null;

    const dayHrSeries =
      dayHrSamples.length > 0
        ? {
            samples: dayHrSamples,
          }
        : null;

    const stressSamples =
      Array.isArray(stress?.stress_samples) && stress.stress_samples.length > 0
        ? stress.stress_samples
        : null;

    const sleepPhase5min =
      sleepPeriodObj && typeof sleepPeriodObj.sleep_phase_5_min === 'string'
        ? sleepPeriodObj.sleep_phase_5_min
        : null;
    const movement30Sec =
      sleepPeriodObj && typeof sleepPeriodObj.movement_30_sec === 'string'
        ? sleepPeriodObj.movement_30_sec
        : null;

    const metrics = {
      student_id,
      date: syncDate,
      
      // Existing metrics
      readiness_score: readiness?.score ?? null,
      sleep_score: dailySleep?.score ?? null,
      hrv_balance: readiness?.contributors?.hrv_balance ?? null,
      resting_heart_rate: restingHeartRate,
      temperature_deviation: readiness?.contributors?.temperature_deviation ?? null,
      activity_balance: readiness?.contributors?.activity_balance ?? null,
      
      // Activity metrics
      activity_score: activity?.score ?? null,
      steps: activity?.steps ?? null,
      active_calories: activity?.active_calories ?? null,
      total_calories: activity?.total_calories ?? null,
      met_minutes: activity?.equivalent_walking_distance ?? null,
      high_activity_time: activity?.high_activity_time ?? null,
      medium_activity_time: activity?.medium_activity_time ?? null,
      low_activity_time: activity?.low_activity_time ?? null,
      sedentary_time: activity?.sedentary_time ?? null,
      training_volume: activity?.training_volume ?? null,
      training_frequency: activity?.training_frequency ?? null,
      
      // Sleep detailed metrics from sleep periods
      total_sleep_duration: sleepPeriod?.total_sleep_duration ?? null,
      deep_sleep_duration: sleepPeriod?.deep_sleep_duration ?? null,
      rem_sleep_duration: sleepPeriod?.rem_sleep_duration ?? null,
      light_sleep_duration: sleepPeriod?.light_sleep_duration ?? null,
      awake_time: sleepPeriod?.awake_time ?? null,
      sleep_efficiency: sleepPeriod?.efficiency ?? null,
      sleep_latency: sleepPeriod?.latency ?? null,
      lowest_heart_rate: sleepPeriod?.lowest_heart_rate ?? null,
      average_sleep_hrv: sleepPeriod?.average_hrv ?? null,
      average_breath: sleepPeriod?.average_breath ?? null,
      
      // Stress metrics
      stress_high_time: stress?.stress_high ?? null,
      recovery_high_time: stress?.recovery_high ?? null,
      day_summary: stress?.day_summary ?? null,
      
      // SpO2 metrics
      spo2_average: spo2?.spo2_percentage?.average ?? null,
      breathing_disturbance_index: spo2?.breathing_disturbance_index ?? null,
      
      // VO2 Max
      vo2_max: vo2?.vo2_max ?? null,
      
      // Resilience
      resilience_level: resilience?.level ?? null,
    };

    const acuteMetrics = {
      student_id,
      date: syncDate,
      sleep_hrv_series: sleepHrvSeries,
      sleep_hr_series: sleepHrSeries,
      day_hr_series: dayHrSeries,
      sleep_phase_5min: sleepPhase5min,
      movement_30_sec: movement30Sec,
      stress_samples: stressSamples,
      hrv_night_min: hrvStats.min,
      hrv_night_max: hrvStats.max,
      hrv_night_last: hrvStats.last,
      hrv_night_stddev: hrvStats.stddev,
      hr_night_min: hrNightStats.min !== null ? Math.round(hrNightStats.min) : null,
      hr_night_max: hrNightStats.max !== null ? Math.round(hrNightStats.max) : null,
      hr_night_last: hrNightStats.last !== null ? Math.round(hrNightStats.last) : null,
      hr_day_min: hrDayStats.min !== null ? Math.round(hrDayStats.min) : null,
      hr_day_max: hrDayStats.max !== null ? Math.round(hrDayStats.max) : null,
      hr_day_avg: hrDayStats.avg,
      samples_count_hrv: hrvStats.count,
      samples_count_hr_day: hrDayStats.count,
    };
    const metricColumnsForMerge = Object.keys(metrics).join(',');
    const acuteMetricColumnsForMerge = Object.keys(acuteMetrics).join(',');

    if (DEBUG) console.log('Extracted metrics:', metrics);
    // Check if all values are null (no data available)
    const hasData = hasAnyMetricValue(metrics as Record<string, unknown>);
    const hasAcuteData =
      acuteMetrics.samples_count_hrv > 0 ||
      acuteMetrics.samples_count_hr_day > 0 ||
      acuteMetrics.sleep_phase_5min !== null ||
      acuteMetrics.movement_30_sec !== null ||
      acuteMetrics.stress_samples !== null;

    if (!hasData && !hasAcuteData && !hasWorkoutsData) {
      if (DEBUG) console.log('No Oura data available for date:', syncDate);

      const { error: noDataSyncUpdateError } = await supabaseClient
        .from('oura_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connection.id);
      if (noDataSyncUpdateError) {
        console.warn('Failed to update last_sync_at for no-data sync:', noDataSyncUpdateError.message);
        warnings.push('Falha ao atualizar last_sync_at (sync sem dados).');
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: `Sem dados do Oura Ring para ${syncDate}.`,
          synced_metrics: null,
          date: syncDate,
          warnings,
        }),
        { headers: jsonHeaders }
      );
    }

    if (hasData) {
      // O-11: Preserve previous non-null values when Oura returns sparse payloads.
      const { data: existingMetricRow, error: existingMetricRowError } = await supabaseClient
        .from('oura_metrics')
        .select(metricColumnsForMerge)
        .eq('student_id', student_id)
        .eq('date', syncDate)
        .maybeSingle();

      if (existingMetricRowError) {
        console.warn('Failed to fetch existing daily metric for merge:', existingMetricRowError.message);
        warnings.push('Falha ao buscar métrica diária anterior para merge.');
      }

      const mergedMetrics = mergePreservingExisting(
        metrics as Record<string, unknown>,
        !existingMetricRowError && isPlainObject(existingMetricRow) ? existingMetricRow : null
      );

      // Upsert metrics
      const { error: upsertError } = await supabaseClient
        .from('oura_metrics')
        .upsert(mergedMetrics, { onConflict: 'student_id,date' });

      if (upsertError) {
        console.error('Failed to save metrics:', upsertError);
        return jsonResponse(500, { error: upsertError.message });
      }
    }

    if (hasAcuteData) {
      const { data: existingAcuteRow, error: existingAcuteRowError } = await supabaseClient
        .from('oura_acute_metrics')
        .select(acuteMetricColumnsForMerge)
        .eq('student_id', student_id)
        .eq('date', syncDate)
        .maybeSingle();

      if (existingAcuteRowError) {
        console.warn('Failed to fetch existing acute metric for merge:', existingAcuteRowError.message);
        warnings.push('Falha ao buscar métrica aguda anterior para merge.');
      }

      const mergedAcuteMetrics = mergePreservingExisting(
        acuteMetrics as Record<string, unknown>,
        !existingAcuteRowError && isPlainObject(existingAcuteRow) ? existingAcuteRow : null
      );

      const { error: acuteUpsertError } = await supabaseClient
        .from('oura_acute_metrics')
        .upsert(mergedAcuteMetrics, { onConflict: 'student_id,date' });

      if (acuteUpsertError) {
        // Non-blocking: main daily metrics are already persisted.
        console.error('Failed to save acute metrics (non-blocking):', acuteUpsertError);
        warnings.push('Falha ao salvar métricas agudas (não bloqueante).');
      }
    }

    // Save workouts
    if (workoutsData?.data && workoutsData.data.length > 0) {
      if (DEBUG) console.log(`Found ${workoutsData.data.length} workouts to save`);
      
      const workouts = workoutsData.data.map((w: Record<string, unknown>) => {
        const heartRate = w.heart_rate as Record<string, unknown> | undefined;
        return {
          student_id,
          oura_workout_id: w.id,
          activity: w.activity,
          start_datetime: w.start_datetime,
          end_datetime: w.end_datetime,
          calories: w.calories ?? null,
          distance: w.distance ?? null,
          intensity: w.intensity ?? null,
          average_heart_rate: heartRate?.average ?? null,
          max_heart_rate: heartRate?.max ?? null,
          source: w.source ?? null,
        };
      });

      const { error: workoutsError } = await supabaseClient
        .from('oura_workouts')
        .upsert(workouts, { onConflict: 'student_id,oura_workout_id' });

      if (workoutsError) {
        console.error('Failed to save workouts:', workoutsError.message);
        warnings.push('Falha ao salvar treinos do Oura (não bloqueante).');
      }
    }

    // Update last_sync_at
    const { error: lastSyncUpdateError } = await supabaseClient
      .from('oura_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', connection.id);
    if (lastSyncUpdateError) {
      console.warn('Failed to update last_sync_at after sync:', lastSyncUpdateError.message);
      warnings.push('Falha ao atualizar last_sync_at após sync.');
    }

    if (DEBUG) console.log('Oura sync completed for', syncDate);

    return jsonResponse(200, {
      success: true,
      force_sync,
      synced_metrics: hasData ? metrics : null,
      has_acute_data: hasAcuteData,
      synced_acute: hasAcuteData
        ? {
            samples_count_hrv: acuteMetrics.samples_count_hrv,
            samples_count_hr_day: acuteMetrics.samples_count_hr_day,
            hrv_night_min: acuteMetrics.hrv_night_min,
            hrv_night_last: acuteMetrics.hrv_night_last,
            hr_day_avg: acuteMetrics.hr_day_avg,
          }
        : null,
      warnings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in oura-sync:', error);
    return jsonResponse(500, { error: message });
  }
});
