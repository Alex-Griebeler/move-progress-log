CREATE OR REPLACE FUNCTION public.create_group_workout_session_with_exercises(
  p_student_id UUID,
  p_prescription_id UUID,
  p_date DATE,
  p_time TIME WITHOUT TIME ZONE,
  p_exercises JSONB DEFAULT '[]'::JSONB
)
RETURNS public.workout_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.workout_sessions%ROWTYPE;
  v_exercise JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_student_id IS NULL OR p_prescription_id IS NULL OR p_date IS NULL OR p_time IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Invalid exercises payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.trainer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Student not found or unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_prescriptions p
    WHERE p.id = p_prescription_id
      AND p.trainer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Prescription not found or unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.prescription_assignments pa
    WHERE pa.prescription_id = p_prescription_id
      AND pa.student_id = p_student_id
      AND pa.start_date <= p_date
      AND (pa.end_date IS NULL OR pa.end_date >= p_date)
  ) THEN
    RAISE EXCEPTION 'Prescription is not assigned to this student for the given date' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workout_sessions (
    student_id,
    prescription_id,
    date,
    time,
    session_type
  )
  VALUES (
    p_student_id,
    p_prescription_id,
    p_date,
    p_time,
    'group'
  )
  RETURNING * INTO v_session;

  FOR v_exercise IN
    SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    IF COALESCE(TRIM(v_exercise->>'exercise_name'), '') = '' THEN
      RAISE EXCEPTION 'exercise_name is required for all exercises';
    END IF;

    INSERT INTO public.exercises (
      session_id,
      exercise_name,
      sets,
      reps,
      load_kg,
      load_description,
      load_breakdown,
      observations
    )
    VALUES (
      v_session.id,
      v_exercise->>'exercise_name',
      CASE
        WHEN v_exercise ? 'sets'
          AND jsonb_typeof(v_exercise->'sets') IN ('number', 'string')
          AND (v_exercise->>'sets') ~ '^-?\d+$'
        THEN (v_exercise->>'sets')::INTEGER
        ELSE NULL
      END,
      CASE
        WHEN v_exercise ? 'reps'
          AND jsonb_typeof(v_exercise->'reps') IN ('number', 'string')
          AND (v_exercise->>'reps') ~ '^-?\d+$'
        THEN (v_exercise->>'reps')::INTEGER
        ELSE NULL
      END,
      CASE
        WHEN v_exercise ? 'load_kg'
          AND jsonb_typeof(v_exercise->'load_kg') IN ('number', 'string')
          AND (v_exercise->>'load_kg') ~ '^[-+]?\d+(\.\d+)?$'
        THEN (v_exercise->>'load_kg')::NUMERIC
        ELSE NULL
      END,
      CASE WHEN jsonb_typeof(v_exercise->'load_description') = 'string' THEN v_exercise->>'load_description' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'load_breakdown') = 'string' THEN v_exercise->>'load_breakdown' ELSE NULL END,
      CASE WHEN jsonb_typeof(v_exercise->'observations') = 'string' THEN v_exercise->>'observations' ELSE NULL END
    );
  END LOOP;

  RETURN v_session;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_workout_session_with_exercises(UUID, UUID, DATE, TIME WITHOUT TIME ZONE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_workout_session_with_exercises(UUID, UUID, DATE, TIME WITHOUT TIME ZONE, JSONB) TO authenticated;
