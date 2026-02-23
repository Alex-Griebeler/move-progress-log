CREATE OR REPLACE FUNCTION public.delete_prescription_cascade(p_prescription_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  existing_exercise_ids UUID[];
BEGIN
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