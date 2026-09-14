-- Espelho Oura/Whoop → app pessoal. FASE 2, mensagem B ao Lovable. Depende de 01_estrutura.sql.
-- Cada função abaixo é a definição EFETIVA lida do banco em 14/09/2026 (pg_get_functiondef), com UMA
-- mudança: ficha mínima (students.external_source preenchido) fica fora. Assinaturas, SECURITY,
-- search_path e demais regras preservados. Para fichas com external_source NULL (todas as atuais),
-- o resultado é idêntico.
--
-- Por que só estas: são as SECURITY DEFINER que leem `students` direto (a RLS não as alcança).
-- count_active_students, *_frequency_dropping, *_prescriptions_stagnant e compute_week_adherence
-- partem de sessões/atribuições — uma ficha mínima nunca tem nenhuma, porque as duas funções de
-- criação de sessão passam a recusá-la. RPCs de token Oura/Whoop NÃO mudam (a coleta das fichas
-- mínimas precisa delas).

-- Inativos: sem o filtro, a ficha mínima (nunca tem sessão) viraria "aluno inativo" nos KPIs.
CREATE OR REPLACE FUNCTION public.count_students_inactive(p_days integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.assert_staff();
  SELECT COUNT(*)::integer FROM students s
  WHERE s.created_at::date <= CURRENT_DATE - p_days
    AND s.external_source IS NULL
    AND NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.student_id = s.id AND ws.date >= CURRENT_DATE - p_days);
$function$;

CREATE OR REPLACE FUNCTION public.list_students_inactive(p_days integer)
 RETURNS TABLE(student_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.assert_staff();
  SELECT s.id FROM students s
  WHERE s.created_at::date <= CURRENT_DATE - p_days
    AND s.external_source IS NULL
    AND NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.student_id = s.id AND ws.date >= CURRENT_DATE - p_days);
$function$;

-- Aderência: denominador só com fichas operacionais (defesa; ficha mínima não tem atribuição).
CREATE OR REPLACE FUNCTION public.compute_week_adherence()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH week_start AS (
    SELECT date_trunc('week', CURRENT_DATE)::date AS d
  ),
  realized_q AS (
    SELECT COUNT(*)::integer AS realized
    FROM workout_sessions, week_start
    WHERE date >= week_start.d
  ),
  prescribed_q AS (
    SELECT COALESCE(SUM(s.weekly_sessions_proposed), 0)::integer AS prescribed
    FROM students s
    WHERE s.external_source IS NULL
      AND EXISTS (
      SELECT 1
      FROM prescription_assignments pa
      WHERE pa.student_id = s.id
        AND pa.start_date <= CURRENT_DATE
        AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE)
    )
  )
  SELECT json_build_object(
    'realized', realized_q.realized,
    'prescribed', prescribed_q.prescribed,
    'percentage', CASE
      WHEN prescribed_q.prescribed > 0
        THEN ROUND((realized_q.realized::numeric / prescribed_q.prescribed) * 100, 1)
      ELSE 0
    END
  )
  FROM realized_q, prescribed_q;
$function$;

-- Criação de sessão (SECURITY DEFINER): ficha mínima não recebe sessão.
CREATE OR REPLACE FUNCTION public.create_workout_session_with_exercises(p_student_id uuid, p_date date, p_time time without time zone, p_session_type text DEFAULT 'individual'::text, p_exercises jsonb DEFAULT '[]'::jsonb)
 RETURNS workout_sessions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.workout_sessions%ROWTYPE;
  v_exercise JSONB;
  v_exercise_library_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_student_id IS NULL OR p_date IS NULL OR p_time IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF p_session_type NOT IN ('individual', 'group') THEN
    RAISE EXCEPTION 'Invalid session_type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.trainer_id = auth.uid() AND s.external_source IS NULL
  ) THEN
    RAISE EXCEPTION 'Student not found or unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Invalid exercises payload';
  END IF;

  INSERT INTO public.workout_sessions (student_id, date, time, session_type)
  VALUES (p_student_id, p_date, p_time, p_session_type)
  RETURNING * INTO v_session;

  FOR v_exercise IN SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    IF COALESCE(TRIM(v_exercise->>'exercise_name'), '') = '' THEN
      RAISE EXCEPTION 'exercise_name is required for all exercises';
    END IF;

    v_exercise_library_id := NULL;
    IF COALESCE(v_exercise->>'exercise_library_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_exercise_library_id := (v_exercise->>'exercise_library_id')::UUID;
    END IF;

    INSERT INTO public.exercises (
      session_id, exercise_library_id, exercise_name,
      sets, reps, load_kg, load_description, load_breakdown, observations,
      reserve_reps, is_best_set
    )
    VALUES (
      v_session.id,
      v_exercise_library_id,
      v_exercise->>'exercise_name',
      CASE WHEN v_exercise ? 'sets' AND jsonb_typeof(v_exercise->'sets') IN ('number','string') AND (v_exercise->>'sets') ~ '^-?\d+$' THEN (v_exercise->>'sets')::INTEGER ELSE NULL END,
      CASE WHEN v_exercise ? 'reps' AND jsonb_typeof(v_exercise->'reps') IN ('number','string') AND (v_exercise->>'reps') ~ '^-?\d+$' THEN (v_exercise->>'reps')::INTEGER ELSE NULL END,
      CASE WHEN v_exercise ? 'load_kg' AND jsonb_typeof(v_exercise->'load_kg') IN ('number','string') AND (v_exercise->>'load_kg') ~ '^[-+]?\d+(\.\d+)?$' THEN (v_exercise->>'load_kg')::NUMERIC ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'load_description') = 'string' THEN v_exercise->>'load_description' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'load_breakdown') = 'string' THEN v_exercise->>'load_breakdown' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'observations') = 'string' THEN v_exercise->>'observations' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'reserve_reps') = 'string' THEN v_exercise->>'reserve_reps' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'is_best_set') = 'boolean' THEN (v_exercise->>'is_best_set')::boolean ELSE false END
    );
  END LOOP;

  RETURN v_session;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_group_workout_session_with_exercises(p_student_id uuid, p_prescription_id uuid, p_date date, p_time time without time zone, p_exercises jsonb DEFAULT '[]'::jsonb)
 RETURNS workout_sessions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.workout_sessions%ROWTYPE;
  v_exercise JSONB;
  v_exercise_library_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_student_id IS NULL OR p_prescription_id IS NULL OR p_date IS NULL OR p_time IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Invalid exercises payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.trainer_id = auth.uid() AND s.external_source IS NULL
  ) THEN
    RAISE EXCEPTION 'Student not found or unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workout_prescriptions p
    WHERE p.id = p_prescription_id AND p.trainer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Prescription not found or unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.prescription_assignments pa
    WHERE pa.prescription_id = p_prescription_id
      AND pa.student_id = p_student_id
      AND pa.start_date <= p_date
      AND (pa.end_date IS NULL OR pa.end_date >= p_date)
  ) THEN
    RAISE EXCEPTION 'Prescription is not assigned to this student for the given date' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workout_sessions (student_id, prescription_id, date, time, session_type)
  VALUES (p_student_id, p_prescription_id, p_date, p_time, 'group')
  RETURNING * INTO v_session;

  FOR v_exercise IN SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    IF COALESCE(TRIM(v_exercise->>'exercise_name'), '') = '' THEN
      RAISE EXCEPTION 'exercise_name is required for all exercises';
    END IF;

    v_exercise_library_id := NULL;
    IF COALESCE(v_exercise->>'exercise_library_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_exercise_library_id := (v_exercise->>'exercise_library_id')::UUID;
    END IF;

    INSERT INTO public.exercises (
      session_id, exercise_library_id, exercise_name,
      sets, reps, load_kg, load_description, load_breakdown, observations,
      reserve_reps, is_best_set
    )
    VALUES (
      v_session.id,
      v_exercise_library_id,
      v_exercise->>'exercise_name',
      CASE WHEN v_exercise ? 'sets' AND jsonb_typeof(v_exercise->'sets') IN ('number','string') AND (v_exercise->>'sets') ~ '^-?\d+$' THEN (v_exercise->>'sets')::INTEGER ELSE NULL END,
      CASE WHEN v_exercise ? 'reps' AND jsonb_typeof(v_exercise->'reps') IN ('number','string') AND (v_exercise->>'reps') ~ '^-?\d+$' THEN (v_exercise->>'reps')::INTEGER ELSE NULL END,
      CASE WHEN v_exercise ? 'load_kg' AND jsonb_typeof(v_exercise->'load_kg') IN ('number','string') AND (v_exercise->>'load_kg') ~ '^[-+]?\d+(\.\d+)?$' THEN (v_exercise->>'load_kg')::NUMERIC ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'load_description') = 'string' THEN v_exercise->>'load_description' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'load_breakdown') = 'string' THEN v_exercise->>'load_breakdown' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'observations') = 'string' THEN v_exercise->>'observations' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'reserve_reps') = 'string' THEN v_exercise->>'reserve_reps' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'is_best_set') = 'boolean' THEN (v_exercise->>'is_best_set')::boolean ELSE false END
    );
  END LOOP;

  RETURN v_session;
END;
$function$;

-- Baselines da Fabrik (SECURITY DEFINER): ficha mínima não é atendida pelo app da Fabrik.
CREATE OR REPLACE FUNCTION public.calc_oura_baseline(p_student_id uuid, p_days integer DEFAULT 14)
 RETURNS TABLE(avg_hrv numeric, avg_rhr numeric, avg_sleep_score numeric, data_points integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_staff();
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id
      AND s.external_source IS NULL
      AND (s.trainer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'not authorized for this student';
  END IF;
  RETURN QUERY
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1),
    ROUND(AVG(om.resting_heart_rate)::numeric, 1),
    ROUND(AVG(om.sleep_score)::numeric, 1),
    COUNT(*)::int
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (CURRENT_DATE - p_days)
    AND om.date <= CURRENT_DATE
    AND (om.average_sleep_hrv IS NOT NULL OR om.resting_heart_rate IS NOT NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calc_oura_baseline_v2(p_student_id uuid, p_days integer DEFAULT 30, p_as_of date DEFAULT CURRENT_DATE)
 RETURNS TABLE(avg_hrv numeric, avg_rhr numeric, avg_sleep_score numeric, hrv_points integer, rhr_points integer, sleep_points integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_staff();
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id
      AND s.external_source IS NULL
      AND (s.trainer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'not authorized for this student';
  END IF;
  RETURN QUERY
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1),
    ROUND(AVG(om.resting_heart_rate)::numeric, 1),
    ROUND(AVG(om.sleep_score)::numeric, 1),
    COUNT(om.average_sleep_hrv)::int,
    COUNT(om.resting_heart_rate)::int,
    COUNT(om.sleep_score)::int
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (p_as_of - p_days)
    AND om.date < p_as_of;
END;
$function$;