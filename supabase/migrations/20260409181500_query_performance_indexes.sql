-- Performance indexes for high-frequency report/session queries.
-- Safe re-runnable migration.

CREATE INDEX IF NOT EXISTS idx_exercises_session_id_created_at
  ON public.exercises(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_exercises_session_id_exercise_name
  ON public.exercises(session_id, exercise_name);

CREATE INDEX IF NOT EXISTS idx_student_reports_student_period_end
  ON public.student_reports(student_id, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_student_reports_overlap_lookup
  ON public.student_reports(student_id, trainer_id, status, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_report_tracked_exercises_report_variation
  ON public.report_tracked_exercises(report_id, load_variation_percentage DESC);
