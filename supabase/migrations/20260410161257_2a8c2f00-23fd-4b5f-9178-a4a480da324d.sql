-- Create oura_acute_metrics table
CREATE TABLE IF NOT EXISTS public.oura_acute_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_hrv_series JSONB,
  sleep_hr_series JSONB,
  day_hr_series JSONB,
  sleep_phase_5min TEXT,
  movement_30_sec TEXT,
  stress_samples JSONB,
  hrv_night_min NUMERIC,
  hrv_night_max NUMERIC,
  hrv_night_last NUMERIC,
  hrv_night_stddev NUMERIC,
  hr_night_min NUMERIC,
  hr_night_max NUMERIC,
  hr_night_last NUMERIC,
  hr_day_min NUMERIC,
  hr_day_max NUMERIC,
  hr_day_avg NUMERIC,
  samples_count_hrv INTEGER NOT NULL DEFAULT 0,
  samples_count_hr_day INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT oura_acute_metrics_student_date_unique UNIQUE (student_id, date)
);

-- Enable RLS
ALTER TABLE public.oura_acute_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy: trainers access own student metrics
DROP POLICY IF EXISTS "Trainers access own student acute metrics" ON public.oura_acute_metrics;
CREATE POLICY "Trainers access own student acute metrics"
  ON public.oura_acute_metrics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = oura_acute_metrics.student_id
        AND students.trainer_id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_oura_acute_metrics_student_date
  ON public.oura_acute_metrics (student_id, date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_oura_acute_metrics_updated_at ON public.oura_acute_metrics;
CREATE TRIGGER update_oura_acute_metrics_updated_at
  BEFORE UPDATE ON public.oura_acute_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
