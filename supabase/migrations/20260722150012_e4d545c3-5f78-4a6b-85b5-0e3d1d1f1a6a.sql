-- Opcao A: potencia NAO usa subcategoria (forma=movement_pattern, plano=movement_plane,
-- lado=laterality). Zera a subcategoria redundante de toda a potencia. Idempotente.
-- Companion: ExerciseReviewPage deixa de contar subcategoria como pendencia p/ potencia.
UPDATE public.exercises_library SET subcategory = NULL
WHERE category = 'potencia_pliometria' AND subcategory IS NOT NULL;