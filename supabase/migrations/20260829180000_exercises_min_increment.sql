-- R8c (decisão 4, ratificada 29/08): incremento mínimo de carga POR
-- EXERCÍCIO na biblioteca — a sugestão assistida inferia o passo por texto
-- do equipamento ("barra" → 2,5kg) e podia sugerir carga que a máquina não
-- tem. NULL = heurística continua como fallback declarado.
-- Idempotente. Já aplicada em produção em 2026-08-29.

ALTER TABLE public.exercises_library
  ADD COLUMN IF NOT EXISTS min_increment_kg numeric(5,2) CHECK (min_increment_kg > 0);

COMMENT ON COLUMN public.exercises_library.min_increment_kg IS
  'Incremento mínimo de carga em kg, na MESMA unidade em que a carga deste exercício é registrada (total ou por halter/lado). NULL = inferir do equipamento (heurística).';
