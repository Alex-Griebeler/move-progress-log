-- Create workout_prescriptions table
CREATE TABLE public.workout_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_exercises table
CREATE TABLE public.prescription_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.workout_prescriptions(id) ON DELETE CASCADE,
  exercise_library_id UUID NOT NULL REFERENCES public.exercises_library(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL,
  sets TEXT NOT NULL,
  reps TEXT NOT NULL,
  interval_seconds INTEGER,
  pse TEXT,
  training_method TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_adaptations table (regressões)
CREATE TABLE public.exercise_adaptations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_exercise_id UUID NOT NULL REFERENCES public.prescription_exercises(id) ON DELETE CASCADE,
  adaptation_type TEXT NOT NULL CHECK (adaptation_type IN ('regression_1', 'regression_2', 'regression_3')),
  exercise_library_id UUID NOT NULL REFERENCES public.exercises_library(id) ON DELETE RESTRICT,
  sets TEXT,
  reps TEXT,
  interval_seconds INTEGER,
  pse TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_assignments table
CREATE TABLE public.prescription_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.workout_prescriptions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  custom_adaptations JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prescription_id, student_id, start_date)
);

-- Enable RLS
ALTER TABLE public.workout_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now)
CREATE POLICY "Acesso público à tabela workout_prescriptions"
ON public.workout_prescriptions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público à tabela prescription_exercises"
ON public.prescription_exercises
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público à tabela exercise_adaptations"
ON public.exercise_adaptations
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público à tabela prescription_assignments"
ON public.prescription_assignments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_workout_prescriptions_updated_at
BEFORE UPDATE ON public.workout_prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_prescription_exercises_prescription_id ON public.prescription_exercises(prescription_id);
CREATE INDEX idx_prescription_exercises_order ON public.prescription_exercises(prescription_id, order_index);
CREATE INDEX idx_exercise_adaptations_exercise_id ON public.exercise_adaptations(prescription_exercise_id);
CREATE INDEX idx_prescription_assignments_prescription_id ON public.prescription_assignments(prescription_id);
CREATE INDEX idx_prescription_assignments_student_id ON public.prescription_assignments(student_id);