-- Whoop: uma coleta sem sono (ou sem recovery) não apaga mais o que já está
-- gravado no dia.
--
-- `replace_whoop_metrics_batch` apagava a linha do ciclo e inseria a nova com
-- `DO UPDATE SET col = EXCLUDED.col` em TODAS as 19 colunas. Quando a coleta
-- vinha sem o registro de sono — `primarySleepFor` não acha nenhum sono com
-- `nap = false` no ciclo (mapWhoop.ts) — `mapMetricRow` devolve as 8 colunas
-- de sono como null e elas sobrescreviam os valores já persistidos. O mesmo
-- valia para as colunas de recovery quando o recovery do ciclo não vinha.
-- O log da sincronização registrava sucesso.
--
-- O caminho dos TREINOS já tinha essa proteção ("a score-less re-send can
-- never null-out a score already persisted", whoop-sync/sync.ts); as métricas
-- diárias ficaram de fora. O Oura recebeu o merge atômico na #333
-- (upsert_oura_row_merge): mesma política, valor novo null preserva o gravado.
--
-- Agora: fotografia das linhas dos dias alvo ANTES do delete, e cada coluna
-- entra como COALESCE(valor novo, valor gravado) — no insert e no conflito.
-- A fotografia é por DATA (a linha descreve o dia), então um ciclo que muda
-- de data não carrega os valores do dia anterior para o novo.
-- Validações, contrato e permissões seguem idênticos.

CREATE OR REPLACE FUNCTION public.replace_whoop_metrics_batch(
  p_student_id uuid,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_row jsonb;
  v_index integer := 0;
  v_cycle_id bigint;
  v_date date;
  v_student_id uuid;
  v_cycle_ids bigint[] := ARRAY[]::bigint[];
  v_dates date[] := ARRAY[]::date[];
  v_prev jsonb;
  v_written integer;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'p_student_id não pode ser nulo';
  END IF;

  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_rows deve ser um array JSON';
  END IF;

  IF jsonb_array_length(p_rows) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_index := v_index + 1;

    IF jsonb_typeof(v_row) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'elemento % de p_rows deve ser um objeto JSON', v_index;
    END IF;

    IF NOT (v_row ? 'cycle_id') OR v_row->>'cycle_id' IS NULL THEN
      RAISE EXCEPTION 'elemento % de p_rows deve ter cycle_id bigint não nulo', v_index;
    END IF;

    BEGIN
      v_cycle_id := (v_row->>'cycle_id')::bigint;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'elemento % de p_rows deve ter cycle_id bigint válido', v_index;
    END;

    IF NOT (v_row ? 'date') OR v_row->>'date' IS NULL THEN
      RAISE EXCEPTION 'elemento % de p_rows deve ter date não nula', v_index;
    END IF;

    BEGIN
      v_date := (v_row->>'date')::date;
    EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
      RAISE EXCEPTION 'elemento % de p_rows deve ter date válida', v_index;
    END;

    IF v_row ? 'student_id' THEN
      IF v_row->>'student_id' IS NULL THEN
        RAISE EXCEPTION 'elemento % de p_rows trouxe student_id nulo', v_index;
      END IF;

      BEGIN
        v_student_id := (v_row->>'student_id')::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'elemento % de p_rows trouxe student_id inválido', v_index;
      END;

      IF v_student_id IS DISTINCT FROM p_student_id THEN
        RAISE EXCEPTION 'elemento % de p_rows pertence a outro student_id', v_index;
      END IF;
    END IF;

    IF v_cycle_id = ANY(v_cycle_ids) THEN
      RAISE EXCEPTION 'cycle_id % repetido dentro do lote', v_cycle_id;
    END IF;

    IF v_date = ANY(v_dates) THEN
      RAISE EXCEPTION 'date % repetida dentro do lote', v_date;
    END IF;

    v_cycle_ids := array_append(v_cycle_ids, v_cycle_id);
    v_dates := array_append(v_dates, v_date);
  END LOOP;

  -- Fotografia dos dias alvo ANTES do delete: o que já está gravado só é
  -- substituído por valor novo NÃO nulo.
  SELECT coalesce(jsonb_object_agg(m.date::text, to_jsonb(m)), '{}'::jsonb)
  INTO v_prev
  FROM public.whoop_metrics m
  WHERE m.student_id = p_student_id
    AND m.date = ANY(v_dates);

  DELETE FROM public.whoop_metrics
  WHERE student_id = p_student_id
    AND cycle_id = ANY(v_cycle_ids);

  INSERT INTO public.whoop_metrics AS t (
    student_id,
    date,
    cycle_id,
    recovery_score,
    hrv_rmssd,
    resting_heart_rate,
    spo2,
    skin_temp,
    day_strain,
    kilojoules,
    sleep_performance,
    sleep_efficiency,
    respiratory_rate,
    total_sleep_duration,
    deep_sleep_duration,
    rem_sleep_duration,
    light_sleep_duration,
    awake_time,
    disturbance_count,
    score_state
  )
  SELECT
    p_student_id,
    r.date,
    COALESCE(r.cycle_id, prev.cycle_id),
    COALESCE(r.recovery_score, prev.recovery_score),
    COALESCE(r.hrv_rmssd, prev.hrv_rmssd),
    COALESCE(r.resting_heart_rate, prev.resting_heart_rate),
    COALESCE(r.spo2, prev.spo2),
    COALESCE(r.skin_temp, prev.skin_temp),
    COALESCE(r.day_strain, prev.day_strain),
    COALESCE(r.kilojoules, prev.kilojoules),
    COALESCE(r.sleep_performance, prev.sleep_performance),
    COALESCE(r.sleep_efficiency, prev.sleep_efficiency),
    COALESCE(r.respiratory_rate, prev.respiratory_rate),
    COALESCE(r.total_sleep_duration, prev.total_sleep_duration),
    COALESCE(r.deep_sleep_duration, prev.deep_sleep_duration),
    COALESCE(r.rem_sleep_duration, prev.rem_sleep_duration),
    COALESCE(r.light_sleep_duration, prev.light_sleep_duration),
    COALESCE(r.awake_time, prev.awake_time),
    COALESCE(r.disturbance_count, prev.disturbance_count),
    COALESCE(r.score_state, prev.score_state)
  FROM jsonb_to_recordset(p_rows) AS r(
    student_id uuid,
    date date,
    cycle_id bigint,
    recovery_score integer,
    hrv_rmssd numeric,
    resting_heart_rate integer,
    spo2 numeric,
    skin_temp numeric,
    day_strain numeric,
    kilojoules numeric,
    sleep_performance integer,
    sleep_efficiency numeric,
    respiratory_rate numeric,
    total_sleep_duration integer,
    deep_sleep_duration integer,
    rem_sleep_duration integer,
    light_sleep_duration integer,
    awake_time integer,
    disturbance_count integer,
    score_state text
  )
  LEFT JOIN LATERAL jsonb_populate_record(
    NULL::public.whoop_metrics,
    coalesce(v_prev -> r.date::text, '{}'::jsonb)
  ) AS prev ON true
  ON CONFLICT (student_id, date) DO UPDATE
  SET cycle_id = COALESCE(EXCLUDED.cycle_id, t.cycle_id),
      recovery_score = COALESCE(EXCLUDED.recovery_score, t.recovery_score),
      hrv_rmssd = COALESCE(EXCLUDED.hrv_rmssd, t.hrv_rmssd),
      resting_heart_rate = COALESCE(EXCLUDED.resting_heart_rate, t.resting_heart_rate),
      spo2 = COALESCE(EXCLUDED.spo2, t.spo2),
      skin_temp = COALESCE(EXCLUDED.skin_temp, t.skin_temp),
      day_strain = COALESCE(EXCLUDED.day_strain, t.day_strain),
      kilojoules = COALESCE(EXCLUDED.kilojoules, t.kilojoules),
      sleep_performance = COALESCE(EXCLUDED.sleep_performance, t.sleep_performance),
      sleep_efficiency = COALESCE(EXCLUDED.sleep_efficiency, t.sleep_efficiency),
      respiratory_rate = COALESCE(EXCLUDED.respiratory_rate, t.respiratory_rate),
      total_sleep_duration = COALESCE(EXCLUDED.total_sleep_duration, t.total_sleep_duration),
      deep_sleep_duration = COALESCE(EXCLUDED.deep_sleep_duration, t.deep_sleep_duration),
      rem_sleep_duration = COALESCE(EXCLUDED.rem_sleep_duration, t.rem_sleep_duration),
      light_sleep_duration = COALESCE(EXCLUDED.light_sleep_duration, t.light_sleep_duration),
      awake_time = COALESCE(EXCLUDED.awake_time, t.awake_time),
      disturbance_count = COALESCE(EXCLUDED.disturbance_count, t.disturbance_count),
      score_state = COALESCE(EXCLUDED.score_state, t.score_state),
      updated_at = now();

  GET DIAGNOSTICS v_written = ROW_COUNT;
  RETURN v_written;
END;
$function$;

REVOKE ALL ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) TO service_role;