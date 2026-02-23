-- BUG-001: Stored procedure for atomic prescription update
CREATE OR REPLACE FUNCTION public.update_prescription_with_exercises(
  p_prescription_id UUID,
  p_name TEXT,
  p_objective TEXT,
  p_exercises JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ex JSONB;
  adapt JSONB;
  inserted_exercise_id UUID;
  exercise_index INT := 0;
  existing_exercise_ids UUID[];
BEGIN
  -- 1. Update prescription basic info
  UPDATE workout_prescriptions 
  SET name = p_name, objective = p_objective, updated_at = now()
  WHERE id = p_prescription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;

  -- 2. Get existing exercise IDs for cascade delete
  SELECT ARRAY_AGG(id) INTO existing_exercise_ids
  FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  -- 3. Delete adaptations for existing exercises
  IF existing_exercise_ids IS NOT NULL AND array_length(existing_exercise_ids, 1) > 0 THEN
    DELETE FROM exercise_adaptations
    WHERE prescription_exercise_id = ANY(existing_exercise_ids);
  END IF;

  -- 4. Delete existing exercises
  DELETE FROM prescription_exercises
  WHERE prescription_id = p_prescription_id;

  -- 5. Insert new exercises and their adaptations
  FOR ex IN SELECT * FROM jsonb_array_elements(p_exercises)
  LOOP
    INSERT INTO prescription_exercises (
      prescription_id, exercise_library_id, order_index,
      sets, reps, interval_seconds, pse, training_method,
      observations, group_with_previous, should_track
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
      COALESCE((ex->>'should_track')::BOOLEAN, true)
    )
    RETURNING id INTO inserted_exercise_id;

    -- Insert adaptations for this exercise
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
$$;