-- Fase 2: athlete_daily_loads, athlete_metric_trends, athlete_records, athlete_goals
CREATE MATERIALIZED VIEW public.athlete_daily_loads AS
SELECT
  s.student_id,
  s.date,
  COUNT(e.id)             AS exercise_count,
  SUM(e.load_kg * e.reps) AS total_volume_kg,
  AVG(e.load_kg)          AS avg_load_kg,
  MAX(e.load_kg)          AS max_load_kg
FROM public.workout_sessions s
LEFT JOIN public.exercises e ON e.session_id = s.id
GROUP BY s.student_id, s.date;

CREATE UNIQUE INDEX idx_adl_pk      ON public.athlete_daily_loads (student_id, date);
CREATE INDEX        idx_adl_student ON public.athlete_daily_loads (student_id);

CREATE OR REPLACE VIEW public.athlete_metric_trends AS
SELECT
  student_id, date, total_volume_kg, avg_load_kg, exercise_count,
  AVG(total_volume_kg) OVER (
    PARTITION BY student_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS volume_7d_avg,
  AVG(exercise_count) OVER (
    PARTITION BY student_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS exercises_7d_avg
FROM public.athlete_daily_loads;

CREATE TABLE public.athlete_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  record_type   TEXT NOT NULL CHECK (record_type IN ('max_load', 'max_volume', 'max_reps')),
  value         NUMERIC(10,2) NOT NULL,
  achieved_at   DATE NOT NULL,
  session_id    UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_student  ON public.athlete_records (student_id);
CREATE INDEX idx_ar_exercise ON public.athlete_records (exercise_name);
ALTER TABLE public.athlete_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage athlete_records" ON public.athlete_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = athlete_records.student_id AND s.trainer_id = auth.uid()
  ));

CREATE TABLE public.athlete_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  goal_type    TEXT NOT NULL CHECK (goal_type IN ('volume','frequency','load','custom')),
  target_value NUMERIC(10,2),
  target_unit  TEXT,
  target_date  DATE,
  status       TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','achieved','cancelled')),
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_ag_student ON public.athlete_goals (student_id);
CREATE INDEX idx_ag_status  ON public.athlete_goals (status);
ALTER TABLE public.athlete_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage athlete_goals" ON public.athlete_goals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = athlete_goals.student_id AND s.trainer_id = auth.uid()
  ));
CREATE TRIGGER update_athlete_goals_updated_at
  BEFORE UPDATE ON public.athlete_goals FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
