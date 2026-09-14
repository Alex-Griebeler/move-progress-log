-- Espelho Oura/Whoop → app pessoal. FASE 3, mensagem C ao Lovable. Depende de 01 e 02.
-- Uma função de LEITURA que monta o snapshot do contrato v1 (supabase/functions/_shared/wearableMirror/
-- contract.ts no repo ag-performance). STABLE: todas as leituras usam o mesmo retrato do início da
-- chamada, e snapshot_seq vem do início do comando (ordem entre snapshots = ordem dos retratos).
-- Só service_role executa (a edge function wearable-mirror-export, depois de conferir o segredo).
-- Não escreve em nada. Não lê tokens: as conexões entram só como estado/datas.

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

-- Teto do contrato: no máximo 30 autorizações vivas (acima disso o destino recusaria o snapshot).
CREATE OR REPLACE FUNCTION private.wearable_mirror_grants_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- serializa inserções simultâneas: sem isso, duas podem ver 29 e deixar 31 vivas
  PERFORM pg_advisory_xact_lock(hashtext('wearable_mirror_grants_cap'));
  IF (SELECT count(*) FROM public.wearable_mirror_grants WHERE revoked_at IS NULL AND id <> NEW.id) >= 30 THEN
    RAISE EXCEPTION 'wearable_mirror_grants: limite de 30 autorizações vivas atingido' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION private.wearable_mirror_grants_cap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wearable_mirror_grants_cap ON public.wearable_mirror_grants;
CREATE TRIGGER wearable_mirror_grants_cap
  BEFORE INSERT ON public.wearable_mirror_grants
  FOR EACH ROW EXECUTE FUNCTION private.wearable_mirror_grants_cap();

NOTIFY pgrst, 'reload schema';