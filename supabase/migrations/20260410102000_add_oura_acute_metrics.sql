-- Store acute/intraday Oura time-series for daily interventions
CREATE TABLE IF NOT EXISTS public.oura_acute_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Raw acute series (JSON payloads from Oura API)
  sleep_hrv_series JSONB,
  sleep_hr_series JSONB,
  day_hr_series JSONB,
  sleep_phase_5min TEXT,
  movement_30_sec TEXT,
  stress_samples JSONB,

  -- Summaries for fast rule evaluation
  hrv_night_min NUMERIC(6,2),
  hrv_night_max NUMERIC(6,2),
  hrv_night_last NUMERIC(6,2),
  hrv_night_stddev NUMERIC(8,3),

  hr_night_min INTEGER,
  hr_night_max INTEGER,
  hr_night_last INTEGER,

  hr_day_min INTEGER,
  hr_day_max INTEGER,
  hr_day_avg NUMERIC(6,2),

  samples_count_hrv INTEGER NOT NULL DEFAULT 0,
  samples_count_hr_day INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(student_id, date)
);

ALTER TABLE public.oura_acute_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers access own student acute metrics" ON public.oura_acute_metrics;
CREATE POLICY "Trainers access own student acute metrics"
ON public.oura_acute_metrics
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = oura_acute_metrics.student_id
    AND students.trainer_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_oura_acute_metrics_updated_at ON public.oura_acute_metrics;
CREATE TRIGGER update_oura_acute_metrics_updated_at
  BEFORE UPDATE ON public.oura_acute_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_oura_acute_metrics_student_date
  ON public.oura_acute_metrics(student_id, date DESC);
