
-- Fase B.2 Passo 1A: Excluir exercícios órfãos não utilizados
-- Critérios: numeric_level IS NULL (não vieram do JSON oficial)
-- E NÃO referenciados em prescription_exercises NEM em exercise_adaptations NEM em exercises (sessões)
DELETE FROM exercises_library
WHERE numeric_level IS NULL
  AND id NOT IN (SELECT DISTINCT exercise_library_id FROM prescription_exercises)
  AND id NOT IN (SELECT DISTINCT exercise_library_id FROM exercise_adaptations)
  AND name NOT IN (SELECT DISTINCT exercise_name FROM exercises);
