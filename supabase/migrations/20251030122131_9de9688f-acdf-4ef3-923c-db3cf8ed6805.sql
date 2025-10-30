-- Expand oura_metrics table with activity metrics
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS activity_score INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS steps INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS active_calories INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS total_calories INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS met_minutes INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS high_activity_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS medium_activity_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS low_activity_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS sedentary_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS training_volume INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS training_frequency INTEGER;

-- Add sleep detailed metrics
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS total_sleep_duration INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS deep_sleep_duration INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS rem_sleep_duration INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS light_sleep_duration INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS awake_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS sleep_efficiency NUMERIC(5,2);
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS sleep_latency INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS lowest_heart_rate INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS average_sleep_hrv NUMERIC(6,2);
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS average_breath NUMERIC(5,2);

-- Add stress metrics
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS stress_high_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS recovery_high_time INTEGER;
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS day_summary TEXT;

-- Add SpO2 metrics
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS spo2_average NUMERIC(5,2);
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS breathing_disturbance_index NUMERIC(5,2);

-- Add VO2 Max
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS vo2_max NUMERIC(5,2);

-- Add Resilience
ALTER TABLE oura_metrics ADD COLUMN IF NOT EXISTS resilience_level TEXT;

-- Create oura_workouts table
CREATE TABLE IF NOT EXISTS oura_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  oura_workout_id TEXT NOT NULL,
  activity TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  calories INTEGER,
  distance INTEGER,
  intensity TEXT,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, oura_workout_id)
);

-- Enable RLS on oura_workouts
ALTER TABLE oura_workouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for oura_workouts
CREATE POLICY "Trainers access own student workouts"
ON oura_workouts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM students
    WHERE students.id = oura_workouts.student_id
    AND students.trainer_id = auth.uid()
  )
);