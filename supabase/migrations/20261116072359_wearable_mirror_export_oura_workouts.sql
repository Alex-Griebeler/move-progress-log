-- Espelho Oura/Whoop → app pessoal. DECISÃO 25 (treinos do Oura). NÃO APLICADO: só aplicar com o OK do Alex.
-- Depende de 05_exportacao.sql (já aplicada). Recria public.wearable_mirror_export_snapshot com UMA mudança: a projeção
-- OPCIONAL `oura_workouts` dentro de `projections` de quem tem Oura autorizado (mesma janela de 90 dias, mesma assinatura,
-- mesmo scope all/one). Só LEITURA: não escreve em nada, não lê token. O resto do corpo é idêntico ao de 05_exportacao.sql.
-- Ordem de publicação (qualquer ordem entre banco do pessoal e runner é segura; esta é a que não gera rodada parcial):
--   1) app pessoal: PR da decisão 25 mesclada (runner novo aceita a projeção) e migration 20261117100000 aplicada;
--   2) Fabrik: contract.ts novo (md5 na mensagem) + ESTA migration.
-- Antes disso, se a Fabrik mandar a projeção, o runner ANTIGO do pessoal recusa a autorização ("campo não previsto"):
-- rodada parcial, sem apagar nada, validade de 14 h corre. Por isso a ordem acima.
-- Volta: 16_reversao_treinos_oura.sql. Prova: 15_prova_treinos_oura.sql.
SET lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.wearable_mirror_export_snapshot(
  p_scope text,
  p_grant_id uuid DEFAULT NULL,
  p_destination_student_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_grants jsonb := '[]'::jsonb;
  v_grant record;
  v_from date;
  v_to date;
  v_conn jsonb;
  v_proj jsonb;
  v_rows jsonb;
  v_workouts_total integer;
BEGIN
  IF p_scope IS NULL OR p_scope NOT IN ('all', 'one') THEN
    RAISE EXCEPTION 'invalid_scope' USING ERRCODE = '22023';
  END IF;
  IF p_scope = 'one' AND (p_grant_id IS NULL OR p_destination_student_id IS NULL) THEN
    RAISE EXCEPTION 'invalid_scope' USING ERRCODE = '22023';
  END IF;

  FOR v_grant IN
    SELECT g.*
      FROM public.wearable_mirror_grants g
     WHERE g.destination_app = 'ag_performance'
       AND (p_scope = 'all' OR (g.id = p_grant_id AND g.destination_student_id = p_destination_student_id))
       -- revogadas só por 30 dias no manifesto geral (tempo de sobra para o destino aplicar);
       -- no scope one a revogada sempre aparece
       AND (g.revoked_at IS NULL OR p_scope = 'one' OR g.revoked_at > now() - interval '30 days')
     ORDER BY g.created_at, g.id
  LOOP
    -- Revogada: só identidade e data; nenhuma métrica.
    IF v_grant.revoked_at IS NOT NULL THEN
      v_grants := v_grants || jsonb_build_array(jsonb_build_object(
        'grant_id', v_grant.id,
        'revision', v_grant.revision,
        'destination_student_id', v_grant.destination_student_id,
        'source_student_id', v_grant.source_student_id,
        'providers', to_jsonb(v_grant.providers),
        'history_from', v_grant.history_from,
        'revoked_at', v_grant.revoked_at,
        'period', NULL,
        'connections', '{}'::jsonb,
        'projections', '{}'::jsonb));
      CONTINUE;
    END IF;

    -- janela de 90 dias (SP), nunca antes do histórico autorizado. Histórico que começa no futuro:
    -- período [history_from, history_from] sem linhas (o destino apaga o que houver fora dele).
    v_from := GREATEST(v_today - 89, COALESCE(v_grant.history_from, v_today - 89));
    v_to := GREATEST(v_today, v_from);
    v_conn := '{}'::jsonb;
    v_proj := '{}'::jsonb;

    IF 'oura' = ANY (v_grant.providers) THEN
      v_conn := v_conn || jsonb_build_object('oura', COALESCE((
        SELECT jsonb_build_object(
          'state', CASE WHEN c.is_active THEN 'connected' ELSE 'inactive' END,
          'connected_at', c.connected_at,
          'last_sync_at', c.last_sync_at)
          FROM public.oura_connections c WHERE c.student_id = v_grant.source_student_id
          ORDER BY c.is_active DESC NULLS LAST, c.connected_at DESC NULLS LAST LIMIT 1),
        jsonb_build_object('state', 'not_connected', 'connected_at', NULL, 'last_sync_at', NULL)));

      v_rows := COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'date', m.date,
          'readiness_score', m.readiness_score, 'sleep_score', m.sleep_score,
          'total_sleep_duration', m.total_sleep_duration, 'sleep_efficiency', m.sleep_efficiency,
          'average_sleep_hrv', m.average_sleep_hrv, 'resting_heart_rate', m.resting_heart_rate,
          'stress_high_time', m.stress_high_time, 'active_calories', m.active_calories,
          'temperature_deviation', m.temperature_deviation, 'activity_score', m.activity_score,
          'steps', m.steps) ORDER BY m.date)
          FROM public.oura_metrics m
         WHERE m.student_id = v_grant.source_student_id AND m.date BETWEEN v_from AND v_today), '[]'::jsonb);
      v_proj := v_proj || jsonb_build_object('oura_metrics',
        jsonb_build_object('complete', true, 'count', jsonb_array_length(v_rows), 'rows', v_rows));

      v_rows := COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'date', a.date,
          'hrv_night_last', a.hrv_night_last, 'hrv_night_min', a.hrv_night_min,
          'hr_day_max', a.hr_day_max, 'hr_day_avg', a.hr_day_avg,
          'samples_count_hrv', a.samples_count_hrv, 'samples_count_hr_day', a.samples_count_hr_day) ORDER BY a.date)
          FROM public.oura_acute_metrics a
         WHERE a.student_id = v_grant.source_student_id AND a.date BETWEEN v_from AND v_today), '[]'::jsonb);
      v_proj := v_proj || jsonb_build_object('oura_acute_metrics',
        jsonb_build_object('complete', true, 'count', jsonb_array_length(v_rows), 'rows', v_rows));

      -- Treinos do Oura (contrato aditivo): dia de São Paulo do início dentro da janela; os 500 mais recentes; calorias e
      -- distância arredondadas para inteiro (a tabela da Fabrik guarda decimais; o app pessoal, inteiros). `complete` só
      -- é verdadeiro se NENHUM treino da janela ficou de fora (teto de 500, id ou atividade que o destino recusaria).
      SELECT count(*) INTO v_workouts_total
        FROM public.oura_workouts w
       WHERE w.student_id = v_grant.source_student_id
         AND (w.start_datetime AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_from AND v_today;
      v_rows := COALESCE((
        SELECT jsonb_agg(x.item ORDER BY x.start_datetime, x.oura_workout_id)
          FROM (
            SELECT w.start_datetime, w.oura_workout_id,
                   jsonb_build_object(
                     'oura_workout_id', w.oura_workout_id,
                     'activity', w.activity,
                     'start_datetime', to_char(w.start_datetime AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                     'end_datetime', to_char(GREATEST(w.end_datetime, w.start_datetime) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                     'calories', CASE WHEN w.calories IS NULL THEN NULL ELSE LEAST(GREATEST(round(w.calories), 0), 2000000000)::integer END,
                     'distance', CASE WHEN w.distance IS NULL THEN NULL ELSE LEAST(GREATEST(round(w.distance), 0), 2000000000)::integer END,
                     'intensity', left(w.intensity, 64),
                     'average_heart_rate', w.average_heart_rate,
                     'max_heart_rate', w.max_heart_rate,
                     'source', left(w.source, 64)) AS item
              FROM public.oura_workouts w
             WHERE w.student_id = v_grant.source_student_id
               AND (w.start_datetime AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_from AND v_today
               AND length(w.oura_workout_id) BETWEEN 1 AND 64
               AND length(w.activity) BETWEEN 1 AND 64
             ORDER BY w.start_datetime DESC, w.oura_workout_id
             LIMIT 500) x), '[]'::jsonb);
      v_proj := v_proj || jsonb_build_object('oura_workouts',
        jsonb_build_object('complete', jsonb_array_length(v_rows) = v_workouts_total, 'count', jsonb_array_length(v_rows), 'rows', v_rows));
    END IF;

    IF 'whoop' = ANY (v_grant.providers) THEN
      v_conn := v_conn || jsonb_build_object('whoop', COALESCE((
        SELECT jsonb_build_object(
          'state', CASE WHEN c.is_active THEN 'connected' ELSE 'inactive' END,
          'connected_at', c.connected_at,
          'last_sync_at', c.last_sync_at)
          FROM public.whoop_connections c WHERE c.student_id = v_grant.source_student_id
          ORDER BY c.is_active DESC NULLS LAST, c.connected_at DESC NULLS LAST LIMIT 1),
        jsonb_build_object('state', 'not_connected', 'connected_at', NULL, 'last_sync_at', NULL)));

      v_rows := COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'date', w.date,
          'recovery_score', w.recovery_score, 'score_state', w.score_state,
          'sleep_performance', w.sleep_performance, 'total_sleep_duration', w.total_sleep_duration,
          'sleep_efficiency', w.sleep_efficiency, 'hrv_rmssd', w.hrv_rmssd,
          'resting_heart_rate', w.resting_heart_rate, 'day_strain', w.day_strain) ORDER BY w.date)
          FROM public.whoop_metrics w
         WHERE w.student_id = v_grant.source_student_id AND w.date BETWEEN v_from AND v_today), '[]'::jsonb);
      v_proj := v_proj || jsonb_build_object('whoop_metrics',
        jsonb_build_object('complete', true, 'count', jsonb_array_length(v_rows), 'rows', v_rows));
    END IF;

    v_grants := v_grants || jsonb_build_array(jsonb_build_object(
      'grant_id', v_grant.id,
      'revision', v_grant.revision,
      'destination_student_id', v_grant.destination_student_id,
      'source_student_id', v_grant.source_student_id,
      'providers', to_jsonb(v_grant.providers),
      'history_from', v_grant.history_from,
      'revoked_at', NULL,
      'period', jsonb_build_object('from', v_from, 'to', v_to),
      'connections', v_conn,
      'projections', v_proj));
  END LOOP;

  RETURN jsonb_build_object(
    'schema_version', 1,
    'destination_app', 'ag_performance',
    -- microssegundos do início do comando: ordem entre snapshots acompanha a ordem dos retratos
    'snapshot_seq', (extract(epoch FROM statement_timestamp()) * 1000000)::bigint,
    'generated_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'scope', p_scope,
    'manifest_complete', true,
    'grants', v_grants);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.wearable_mirror_export_snapshot(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wearable_mirror_export_snapshot(text, uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';