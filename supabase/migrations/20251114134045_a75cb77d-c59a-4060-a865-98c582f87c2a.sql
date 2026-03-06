-- Adicionar coluna session_type à tabela workout_sessions
ALTER TABLE public.workout_sessions 
ADD COLUMN session_type TEXT CHECK (session_type IN ('individual', 'group'));

-- Definir valores padrão baseado em lógica existente
-- Se tiver prescription_id com múltiplos alunos na mesma data/hora = grupo
UPDATE public.workout_sessions
SET session_type = CASE
  WHEN prescription_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.workout_sessions ws2
    WHERE ws2.prescription_id = workout_sessions.prescription_id
    AND ws2.date = workout_sessions.date
    AND ws2.time = workout_sessions.time
    AND ws2.id != workout_sessions.id
  ) THEN 'group'
  ELSE 'individual'
END;

-- Tornar o campo obrigatório após popular
ALTER TABLE public.workout_sessions 
ALTER COLUMN session_type SET NOT NULL;

-- Adicionar índice para queries mais rápidas
CREATE INDEX idx_workout_sessions_session_type ON public.workout_sessions(session_type);