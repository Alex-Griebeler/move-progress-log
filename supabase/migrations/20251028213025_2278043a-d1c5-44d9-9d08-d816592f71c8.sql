-- Create trainer profiles table
CREATE TABLE IF NOT EXISTS public.trainer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.trainer_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.trainer_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_trainer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trainer_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trainer();

-- Add trainer_id to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES auth.users(id);

-- Add trainer_id to workout_prescriptions
ALTER TABLE public.workout_prescriptions ADD COLUMN IF NOT EXISTS trainer_id uuid REFERENCES auth.users(id);

-- Update RLS policies for students
DROP POLICY IF EXISTS "Acesso público à tabela students" ON public.students;
CREATE POLICY "Trainers manage own students" ON public.students
  FOR ALL USING (
    auth.uid() = trainer_id OR 
    trainer_id IS NULL -- Allow access to existing data until trainer_id is set
  );

-- Update RLS policies for workout_sessions (via student ownership)
DROP POLICY IF EXISTS "Acesso público à tabela workout_sessions" ON public.workout_sessions;
CREATE POLICY "Access via student ownership" ON public.workout_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = workout_sessions.student_id
      AND (students.trainer_id = auth.uid() OR students.trainer_id IS NULL)
    )
  );

-- Update RLS policies for exercises (via session ownership)
DROP POLICY IF EXISTS "Acesso público à tabela exercises" ON public.exercises;
CREATE POLICY "Access via session ownership" ON public.exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.students s ON s.id = ws.student_id
      WHERE ws.id = exercises.session_id
      AND (s.trainer_id = auth.uid() OR s.trainer_id IS NULL)
    )
  );

-- Update RLS policies for workout_prescriptions
DROP POLICY IF EXISTS "Acesso público à tabela workout_prescriptions" ON public.workout_prescriptions;
CREATE POLICY "Trainers manage own prescriptions" ON public.workout_prescriptions
  FOR ALL USING (
    auth.uid() = trainer_id OR
    trainer_id IS NULL
  );

-- Update RLS policies for prescription_exercises (via prescription ownership)
DROP POLICY IF EXISTS "Acesso público à tabela prescription_exercises" ON public.prescription_exercises;
CREATE POLICY "Access via prescription ownership" ON public.prescription_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_prescriptions wp
      WHERE wp.id = prescription_exercises.prescription_id
      AND (wp.trainer_id = auth.uid() OR wp.trainer_id IS NULL)
    )
  );

-- Update RLS policies for exercise_adaptations (via prescription exercise ownership)
DROP POLICY IF EXISTS "Acesso público à tabela exercise_adaptations" ON public.exercise_adaptations;
CREATE POLICY "Access via prescription exercise ownership" ON public.exercise_adaptations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.prescription_exercises pe
      JOIN public.workout_prescriptions wp ON wp.id = pe.prescription_id
      WHERE pe.id = exercise_adaptations.prescription_exercise_id
      AND (wp.trainer_id = auth.uid() OR wp.trainer_id IS NULL)
    )
  );

-- Update RLS policies for prescription_assignments (via prescription ownership)
DROP POLICY IF EXISTS "Acesso público à tabela prescription_assignments" ON public.prescription_assignments;
CREATE POLICY "Access via prescription ownership" ON public.prescription_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_prescriptions wp
      WHERE wp.id = prescription_assignments.prescription_id
      AND (wp.trainer_id = auth.uid() OR wp.trainer_id IS NULL)
    )
  );

-- Keep exercises_library accessible to all authenticated users (it's a shared resource)
DROP POLICY IF EXISTS "Acesso público à tabela exercises_library" ON public.exercises_library;
CREATE POLICY "Authenticated users access exercise library" ON public.exercises_library
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Add RLS policies for storage
CREATE POLICY "Trainers upload student avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Trainers view student avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'student-avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Trainers delete student avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'student-avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Trainers update student avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'student-avatars' AND
    auth.uid() IS NOT NULL
  );

-- Add trigger for updated_at on trainer_profiles
CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON public.trainer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add database constraints for input validation (adjusted to handle existing data)
ALTER TABLE public.students 
  ADD CONSTRAINT name_not_empty CHECK (char_length(trim(name)) > 0),
  ADD CONSTRAINT name_length CHECK (char_length(name) <= 100);

-- Only add positive constraints where data allows it
ALTER TABLE public.exercises 
  ADD CONSTRAINT load_kg_non_negative CHECK (load_kg IS NULL OR load_kg >= 0);

ALTER TABLE public.workout_prescriptions
  ADD CONSTRAINT prescription_name_not_empty CHECK (char_length(trim(name)) > 0),
  ADD CONSTRAINT prescription_name_length CHECK (char_length(name) <= 200);