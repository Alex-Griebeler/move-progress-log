CREATE OR REPLACE FUNCTION public.count_active_students(p_since date)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT student_id)::integer
  FROM workout_sessions
  WHERE date >= p_since;
$$;