-- Create exercises_library table
CREATE TABLE public.exercises_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  movement_pattern TEXT NOT NULL,
  laterality TEXT,
  movement_plane TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Acesso público à tabela exercises_library" 
ON public.exercises_library 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercises_library_updated_at
BEFORE UPDATE ON public.exercises_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster filtering
CREATE INDEX idx_exercises_library_movement_pattern ON public.exercises_library(movement_pattern);
CREATE INDEX idx_exercises_library_laterality ON public.exercises_library(laterality);
CREATE INDEX idx_exercises_library_movement_plane ON public.exercises_library(movement_plane);

-- Insert some example exercises
INSERT INTO public.exercises_library (name, movement_pattern, laterality, movement_plane, description) VALUES
('Agachamento Livre', 'knee_dominant', 'bilateral', 'sagittal', 'Agachamento tradicional com barra'),
('Agachamento Frontal', 'knee_dominant', 'bilateral', 'sagittal', 'Agachamento com barra na frente'),
('Deadlift Convencional', 'hip_dominant', 'bilateral', 'sagittal', 'Levantamento terra tradicional'),
('Romanian Deadlift', 'hip_dominant', 'bilateral', 'sagittal', 'Levantamento terra romeno'),
('Afundo', 'knee_dominant', 'unilateral', 'sagittal', 'Afundo alternado'),
('Bulgarian Split Squat', 'knee_dominant', 'unilateral', 'sagittal', 'Agachamento búlgaro'),
('Single Leg Deadlift', 'hip_dominant', 'unilateral', 'sagittal', 'Levantamento terra unilateral');