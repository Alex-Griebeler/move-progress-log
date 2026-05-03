-- Dashboard KPI RPCs
-- Add 4 read-only aggregation functions used by the new Dashboard stats grid.
-- Each function is STABLE + SECURITY DEFINER, mirroring the existing
-- count_active_students function (see migration 20260223203355).
--
-- Nothing else is altered: no schema changes, no data changes, no RLS edits.
-- Functions are NOT consumed by any code yet — wiring up the UI is deferred
-- to a follow-up PR.
--
-- Manual validation queries (run after applying):
--   SELECT count_students_inactive(7);
--   SELECT count_students_frequency_dropping();
--   SELECT compute_week_adherence();
--   SELECT count_prescriptions_stagnant(4);

-- ────────────────────────────────────────────────────────────────────────────
-- 1. count_students_inactive(p_days int)
--    Number of students that exist for at least p_days but had no
--    workout_session in the last p_days. Brand new students (created < p_days
--    ago) are NOT counted as inactive.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_students_inactive(p_days integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM students s
  WHERE s.created_at::date <= CURRENT_DATE - p_days
    AND NOT EXISTS (
      SELECT 1
      FROM workout_sessions ws
      WHERE ws.student_id = s.id
        AND ws.date >= CURRENT_DATE - p_days
    );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. count_students_frequency_dropping()
--    Number of students whose session count in the LAST 4 weeks (28 days,
--    rolling) is strictly LESS than their count in the 4 weeks BEFORE that
--    (days 28-56 ago). Only students with at least one session in the prior
--    window are considered, to avoid noise from new students.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_students_frequency_dropping()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  WITH prior AS (
    SELECT student_id, COUNT(*)::integer AS prior_count
    FROM workout_sessions
    WHERE date >= CURRENT_DATE - 56
      AND date <  CURRENT_DATE - 28
    GROUP BY student_id
  ),
  recent AS (
    SELECT student_id, COUNT(*)::integer AS recent_count
    FROM workout_sessions
    WHERE date >= CURRENT_DATE - 28
      AND date <  CURRENT_DATE
    GROUP BY student_id
  )
  SELECT COUNT(*)::integer
  FROM prior p
  LEFT JOIN recent r ON r.student_id = p.student_id
  WHERE COALESCE(r.recent_count, 0) < p.prior_count
    AND p.prior_count > 0;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. compute_week_adherence()
--    Returns a json object with the current week's adherence:
--      { "realized": int, "prescribed": int, "percentage": numeric }
--
--    "Current week" starts on Monday (date_trunc('week', ...) is ISO Monday).
--
--    Realized = workout_sessions with date >= week_start.
--    Prescribed = sum of students.weekly_sessions_proposed across students
--                 that have at least one ACTIVE prescription assignment
--                 (start_date <= today AND (end_date IS NULL OR end_date >= today)).
--
--    Students whose weekly_sessions_proposed is null contribute 0 prescribed
--    sessions. This is intentional — they don't have a target yet.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_week_adherence()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
    WHERE EXISTS (
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
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. count_prescriptions_stagnant(p_weeks int)
--    Number of workout_prescriptions that:
--      - have at least one active assignment (start_date <= today AND
--        (end_date IS NULL OR end_date >= today)), AND
--      - have updated_at older than p_weeks weeks.
--
--    Counts the prescription, not the assignments. A single stagnant
--    prescription assigned to 5 students still counts as 1.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.count_prescriptions_stagnant(p_weeks integer)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT wp.id)::integer
  FROM workout_prescriptions wp
  WHERE wp.updated_at < (CURRENT_DATE - (p_weeks * 7))::timestamp
    AND EXISTS (
      SELECT 1
      FROM prescription_assignments pa
      WHERE pa.prescription_id = wp.id
        AND pa.start_date <= CURRENT_DATE
        AND (pa.end_date IS NULL OR pa.end_date >= CURRENT_DATE)
    );
$$;
