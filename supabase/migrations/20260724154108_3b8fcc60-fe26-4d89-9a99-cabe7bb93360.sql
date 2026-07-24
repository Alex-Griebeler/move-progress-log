CREATE OR REPLACE FUNCTION public.assert_staff()
RETURNS void LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) THEN
    RAISE EXCEPTION 'Acesso restrito a treinadores e admins';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assert_staff() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.assert_staff() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.count_active_students(p_since date)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT COUNT(DISTINCT student_id)::integer FROM workout_sessions WHERE date >= p_since;
$$;

CREATE OR REPLACE FUNCTION public.calc_oura_baseline(p_student_id UUID, p_days INT DEFAULT 14)
RETURNS TABLE(avg_hrv NUMERIC, avg_rhr NUMERIC, avg_sleep_score NUMERIC, data_points INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1),
    ROUND(AVG(om.resting_heart_rate)::numeric, 1),
    ROUND(AVG(om.sleep_score)::numeric, 1),
    COUNT(*)::int
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (CURRENT_DATE - p_days)
    AND (om.average_sleep_hrv IS NOT NULL OR om.resting_heart_rate IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.count_students_inactive(p_days integer)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT COUNT(*)::integer FROM students s
  WHERE s.created_at::date <= CURRENT_DATE - p_days
    AND NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.student_id = s.id AND ws.date >= CURRENT_DATE - p_days);
$$;

CREATE OR REPLACE FUNCTION public.count_students_frequency_dropping()
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  WITH prior AS (
    SELECT student_id, COUNT(*)::integer AS prior_count FROM workout_sessions
    WHERE date >= CURRENT_DATE - 56 AND date <  CURRENT_DATE - 28 GROUP BY student_id
  ), recent AS (
    SELECT student_id, COUNT(*)::integer AS recent_count FROM workout_sessions
    WHERE date >= CURRENT_DATE - 28 AND date <  CURRENT_DATE GROUP BY student_id
  )
  SELECT COUNT(*)::integer FROM prior p LEFT JOIN recent r ON r.student_id = p.student_id
  WHERE COALESCE(r.recent_count, 0) < p.prior_count AND p.prior_count > 0;
$$;

CREATE OR REPLACE FUNCTION public.count_prescriptions_stagnant(p_weeks integer)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT COUNT(DISTINCT wp.id)::integer FROM workout_prescriptions wp
  WHERE wp.updated_at < (CURRENT_DATE - (p_weeks * 7))::timestamp
    AND EXISTS (SELECT 1 FROM prescription_assignments pa
      WHERE pa.prescription_id = wp.id AND pa.start_date <= CURRENT_DATE
        AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE));
$$;

CREATE OR REPLACE FUNCTION public.list_students_inactive(p_days integer)
 RETURNS TABLE(student_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT s.id FROM students s
  WHERE s.created_at::date <= CURRENT_DATE - p_days
    AND NOT EXISTS (SELECT 1 FROM workout_sessions ws WHERE ws.student_id = s.id AND ws.date >= CURRENT_DATE - p_days);
$$;

CREATE OR REPLACE FUNCTION public.list_students_frequency_dropping()
 RETURNS TABLE(student_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  WITH prior AS (
    SELECT ws.student_id, COUNT(*)::integer AS prior_count FROM workout_sessions ws
    WHERE ws.date >= CURRENT_DATE - 56 AND ws.date <  CURRENT_DATE - 28 GROUP BY ws.student_id
  ), recent AS (
    SELECT ws.student_id, COUNT(*)::integer AS recent_count FROM workout_sessions ws
    WHERE ws.date >= CURRENT_DATE - 28 AND ws.date <  CURRENT_DATE GROUP BY ws.student_id
  )
  SELECT p.student_id FROM prior p LEFT JOIN recent r ON r.student_id = p.student_id
  WHERE COALESCE(r.recent_count, 0) < p.prior_count AND p.prior_count > 0;
$$;

CREATE OR REPLACE FUNCTION public.list_prescriptions_stagnant(p_weeks integer)
 RETURNS TABLE(prescription_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.assert_staff();
  SELECT DISTINCT wp.id FROM workout_prescriptions wp
  WHERE wp.updated_at < (CURRENT_DATE - (p_weeks * 7))::timestamp
    AND EXISTS (SELECT 1 FROM prescription_assignments pa
      WHERE pa.prescription_id = wp.id AND pa.start_date <= CURRENT_DATE
        AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE));
$$;

CREATE OR REPLACE FUNCTION public.list_unlinked_session_exercise_review()
RETURNS TABLE(normalized_name text, display_name text, total_rows integer, variants text[], load_samples text[], observation_samples text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'trainer')) THEN
    RAISE EXCEPTION 'Acesso restrito a treinadores e admins';
  END IF;
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required to review unlinked session exercises' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH normalized AS (
    SELECT
      regexp_replace(trim(regexp_replace(translate(lower(coalesce(e.exercise_name, '')),
        'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),
        '[^a-z0-9]+', ' ', 'g')), '[[:space:]]+', ' ', 'g') AS normalized_name,
      trim(e.exercise_name) AS exercise_name, e.load_kg,
      nullif(trim(e.load_breakdown), '') AS load_breakdown,
      nullif(trim(e.observations), '') AS observations
    FROM public.exercises e
    WHERE e.exercise_library_id IS NULL AND coalesce(trim(e.exercise_name), '') <> ''
  ),
  variant_counts AS (
    SELECT n.normalized_name, n.exercise_name, count(*)::integer AS variant_rows
    FROM normalized n WHERE n.normalized_name <> '' GROUP BY n.normalized_name, n.exercise_name
  ),
  variant_arrays AS (
    SELECT vc.normalized_name,
      (array_agg(vc.exercise_name ORDER BY vc.variant_rows DESC, vc.exercise_name))[1] AS display_name,
      array_agg(format('%s (%s)', vc.exercise_name, vc.variant_rows) ORDER BY vc.variant_rows DESC, vc.exercise_name) AS variants
    FROM variant_counts vc GROUP BY vc.normalized_name
  ),
  totals AS (
    SELECT n.normalized_name, count(*)::integer AS total_rows FROM normalized n
    WHERE n.normalized_name <> '' GROUP BY n.normalized_name
  )
  SELECT t.normalized_name, va.display_name, t.total_rows, va.variants,
    ARRAY(SELECT sample FROM (
        SELECT DISTINCT coalesce(n2.load_breakdown, CASE WHEN n2.load_kg IS NOT NULL THEN n2.load_kg::text || ' kg' END) AS sample
        FROM normalized n2 WHERE n2.normalized_name = t.normalized_name) s
      WHERE sample IS NOT NULL AND sample <> '' ORDER BY sample LIMIT 3) AS load_samples,
    ARRAY(SELECT sample FROM (
        SELECT DISTINCT n3.observations AS sample FROM normalized n3 WHERE n3.normalized_name = t.normalized_name) s
      WHERE sample IS NOT NULL AND sample <> '' ORDER BY sample LIMIT 2) AS observation_samples
  FROM totals t JOIN variant_arrays va ON va.normalized_name = t.normalized_name
  ORDER BY t.total_rows DESC, va.display_name;
END;
$$;

DROP POLICY IF EXISTS "Trainers manage own student reports" ON public.student_reports;
CREATE POLICY "Trainers manage own student reports" ON public.student_reports
  FOR ALL TO authenticated
  USING ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.students WHERE students.id = student_reports.student_id AND students.trainer_id = auth.uid()) )
  WITH CHECK ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.students WHERE students.id = student_reports.student_id AND students.trainer_id = auth.uid()) );

DROP POLICY IF EXISTS "Access via report ownership" ON public.report_tracked_exercises;
CREATE POLICY "Access via report ownership" ON public.report_tracked_exercises
  FOR ALL TO authenticated
  USING ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.student_reports sr JOIN public.students s ON s.id = sr.student_id WHERE sr.id = report_tracked_exercises.report_id AND s.trainer_id = auth.uid()) )
  WITH CHECK ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.student_reports sr JOIN public.students s ON s.id = sr.student_id WHERE sr.id = report_tracked_exercises.report_id AND s.trainer_id = auth.uid()) );

DROP POLICY IF EXISTS "Trainers access own student audio segments" ON public.session_audio_segments;
CREATE POLICY "Trainers access own student audio segments" ON public.session_audio_segments
  FOR ALL TO authenticated
  USING ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM workout_sessions ws JOIN students s ON s.id = ws.student_id WHERE ws.id = session_audio_segments.session_id AND s.trainer_id = auth.uid()) )
  WITH CHECK ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM workout_sessions ws JOIN students s ON s.id = ws.student_id WHERE ws.id = session_audio_segments.session_id AND s.trainer_id = auth.uid()) );

DROP POLICY IF EXISTS "Trainers access own student adherence" ON public.protocol_adherence;
CREATE POLICY "Trainers access own student adherence" ON public.protocol_adherence
  FOR ALL TO authenticated
  USING ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM students WHERE students.id = protocol_adherence.student_id AND students.trainer_id = auth.uid()) )
  WITH CHECK ( public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM students WHERE students.id = protocol_adherence.student_id AND students.trainer_id = auth.uid()) );

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT s.trainer_id, 'trainer'::public.app_role
FROM public.students s
WHERE s.trainer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = s.trainer_id)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Students can log their progress" ON public.assessment_progress_logs;
CREATE POLICY "Students insert own progress" ON public.assessment_progress_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own progress" ON public.assessment_progress_logs
  FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students view own progress" ON public.assessment_progress_logs
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Staff delete progress" ON public.assessment_progress_logs
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.assessment_protocols p
      JOIN public.assessments a ON a.id = p.assessment_id
      WHERE p.id = assessment_progress_logs.protocol_id
        AND (a.professional_id = auth.uid() OR a.trainer_id = auth.uid())
    )
  );