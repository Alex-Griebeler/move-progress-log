-- Remove o exercício ambíguo "Stiff-leg deadlift" (id8 265e2ba6), redundante
-- com "good morning"/"stiff" (decisão do dono). 0 uso no histórico.
-- exercises.exercise_library_id = ON DELETE SET NULL → execução histórica vira
-- órfã NULL (preservada). prescription_exercises/exercise_adaptations = RESTRICT
-- → se houver vínculo, o DELETE falha e aborta a transação (fail-loud, seguro).
-- Idempotente: deleta 0 linhas se já removido.
DELETE FROM public.exercises_library
WHERE left(id::text, 8) = '265e2ba6'
  AND name = 'Stiff-leg deadlift';
