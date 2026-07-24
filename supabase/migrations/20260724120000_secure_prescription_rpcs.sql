-- SEGURANCA (auditoria R3, achados 1-2 do Codex): as duas RPCs SECURITY DEFINER
-- de prescricao eram concedidas a QUALQUER authenticated sem checagem de dono —
-- um usuario logado podia apagar/reescrever prescricao de qualquer treinador via
-- chamada direta. Guard espelha a policy da tabela workout_prescriptions:
-- dono (trainer_id = auth.uid()) OU admin. Callers reais sao so os hooks do
-- frontend (contexto de usuario); nenhum edge chama com service key, entao
-- auth.uid() nunca e NULL em uso legitimo.

CREATE OR REPLACE FUNCTION public.delete_prescription_cascade(p_prescription_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  existing_exercise_ids UUID[];
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM workout_prescriptions wp
      WHERE wp.id = p_prescription_id AND wp.trainer_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas o treinador dono da prescrição ou admin';
  END IF;

  -- 1. Get exercise IDs
  SELECT ARRAY_AGG(id) INTO existing_exercise_ids
  FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  -- 2. Delete adaptations
  IF existing_exercise_ids IS NOT NULL AND array_length(existing_exercise_ids, 1) > 0 THEN
    DELETE FROM exercise_adaptations
    WHERE prescription_exercise_id = ANY(existing_exercise_ids);
  END IF;

  -- 3. Delete exercises
  DELETE FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  -- 4. Delete assignments
  DELETE FROM prescription_assignments
  WHERE prescription_id = p_prescription_id;

  -- 5. Delete prescription
  DELETE FROM workout_prescriptions
  WHERE id = p_prescription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_prescription_with_exercises(p_prescription_id uuid, p_name text, p_objective text, p_exercises jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ex JSONB;
  adapt JSONB;
  inserted_exercise_id UUID;
  exercise_index INT := 0;
  existing_exercise_ids UUID[];
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM workout_prescriptions wp
      WHERE wp.id = p_prescription_id AND wp.trainer_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas o treinador dono da prescrição ou admin';
  END IF;

  UPDATE workout_prescriptions 
  SET name = p_name, objective = p_objective, updated_at = now()
  WHERE id = p_prescription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;

  SELECT ARRAY_AGG(id) INTO existing_exercise_ids
  FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  IF existing_exercise_ids IS NOT NULL AND array_length(existing_exercise_ids, 1) > 0 THEN
    DELETE FROM exercise_adaptations
    WHERE prescription_exercise_id = ANY(existing_exercise_ids);
  END IF;

  DELETE FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  FOR ex IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    INSERT INTO prescription_exercises (
      prescription_id, exercise_library_id, order_index,
      sets, reps, interval_seconds, pse, training_method,
      observations, group_with_previous, should_track, load, rir
    ) VALUES (
      p_prescription_id,
      (ex->>'exercise_library_id')::UUID,
      exercise_index,
      ex->>'sets',
      ex->>'reps',
      (ex->>'interval_seconds')::INT,
      ex->>'pse',
      ex->>'training_method',
      ex->>'observations',
      COALESCE((ex->>'group_with_previous')::BOOLEAN, false),
      COALESCE((ex->>'should_track')::BOOLEAN, true),
      ex->>'load',
      ex->>'rir'
    )
    RETURNING id INTO inserted_exercise_id;

    IF ex->'adaptations' IS NOT NULL AND jsonb_array_length(ex->'adaptations') > 0 THEN
      FOR adapt IN SELECT * FROM jsonb_array_elements(ex->'adaptations')
      LOOP
        INSERT INTO exercise_adaptations (
          prescription_exercise_id, adaptation_type, exercise_library_id,
          sets, reps, interval_seconds, pse, observations
        ) VALUES (
          inserted_exercise_id,
          adapt->>'type',
          (adapt->>'exercise_library_id')::UUID,
          adapt->>'sets',
          adapt->>'reps',
          (adapt->>'interval_seconds')::INT,
          adapt->>'pse',
          adapt->>'observations'
        );
      END LOOP;
    END IF;

    exercise_index := exercise_index + 1;
  END LOOP;
END;
$function$;
