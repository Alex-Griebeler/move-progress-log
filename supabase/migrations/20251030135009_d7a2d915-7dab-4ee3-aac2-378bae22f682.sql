-- Create student_observations table to track clinical observations from training sessions
CREATE TABLE IF NOT EXISTS public.student_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  observation_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('dor', 'mobilidade', 'força', 'técnica', 'geral')),
  severity TEXT CHECK (severity IN ('baixa', 'média', 'alta')),
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.trainer_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.student_observations ENABLE ROW LEVEL SECURITY;

-- Create policy for trainers to access observations for their students
CREATE POLICY "Trainers access own student observations"
ON public.student_observations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = student_observations.student_id
    AND (students.trainer_id = auth.uid() OR students.trainer_id IS NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_student_observations_student ON public.student_observations(student_id);
CREATE INDEX idx_student_observations_created ON public.student_observations(created_at DESC);
CREATE INDEX idx_student_observations_resolved ON public.student_observations(is_resolved);