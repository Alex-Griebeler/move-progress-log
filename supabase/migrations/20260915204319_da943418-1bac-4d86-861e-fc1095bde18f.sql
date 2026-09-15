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

  DELETE FROM public.whoop_metrics
  WHERE student_id = p_student_id
    AND cycle_id = ANY(v_cycle_ids);

  INSERT INTO public.whoop_metrics (
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
    r.cycle_id,
    r.recovery_score,
    r.hrv_rmssd,
    r.resting_heart_rate,
    r.spo2,
    r.skin_temp,
    r.day_strain,
    r.kilojoules,
    r.sleep_performance,
    r.sleep_efficiency,
    r.respiratory_rate,
    r.total_sleep_duration,
    r.deep_sleep_duration,
    r.rem_sleep_duration,
    r.light_sleep_duration,
    r.awake_time,
    r.disturbance_count,
    r.score_state
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
  ON CONFLICT (student_id, date) DO UPDATE
  SET cycle_id = EXCLUDED.cycle_id,
      recovery_score = EXCLUDED.recovery_score,
      hrv_rmssd = EXCLUDED.hrv_rmssd,
      resting_heart_rate = EXCLUDED.resting_heart_rate,
      spo2 = EXCLUDED.spo2,
      skin_temp = EXCLUDED.skin_temp,
      day_strain = EXCLUDED.day_strain,
      kilojoules = EXCLUDED.kilojoules,
      sleep_performance = EXCLUDED.sleep_performance,
      sleep_efficiency = EXCLUDED.sleep_efficiency,
      respiratory_rate = EXCLUDED.respiratory_rate,
      total_sleep_duration = EXCLUDED.total_sleep_duration,
      deep_sleep_duration = EXCLUDED.deep_sleep_duration,
      rem_sleep_duration = EXCLUDED.rem_sleep_duration,
      light_sleep_duration = EXCLUDED.light_sleep_duration,
      awake_time = EXCLUDED.awake_time,
      disturbance_count = EXCLUDED.disturbance_count,
      score_state = EXCLUDED.score_state,
      updated_at = now();

  GET DIAGNOSTICS v_written = ROW_COUNT;
  RETURN v_written;
END;
$function$;

REVOKE ALL ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_whoop_metrics_batch(uuid, jsonb) TO service_role;