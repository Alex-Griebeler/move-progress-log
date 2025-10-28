-- Add contraction_type and level columns to exercises_library table
ALTER TABLE public.exercises_library
ADD COLUMN IF NOT EXISTS contraction_type text,
ADD COLUMN IF NOT EXISTS level text;

-- Add comments to describe the columns
COMMENT ON COLUMN public.exercises_library.contraction_type IS 'Type of muscle contraction (e.g., concentric, eccentric, isometric)';
COMMENT ON COLUMN public.exercises_library.level IS 'Difficulty level of the exercise (e.g., beginner, intermediate, advanced)';