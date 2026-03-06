
-- Fase A: Adicionar campos para suportar o JSON categorizado
ALTER TABLE public.exercises_library 
  ADD COLUMN IF NOT EXISTS numeric_level INTEGER,
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Índices para performance nas queries de geração
CREATE INDEX IF NOT EXISTS idx_exercises_library_numeric_level ON public.exercises_library (numeric_level);
CREATE INDEX IF NOT EXISTS idx_exercises_library_position ON public.exercises_library (position);
CREATE INDEX IF NOT EXISTS idx_exercises_library_tags ON public.exercises_library USING GIN (tags);
