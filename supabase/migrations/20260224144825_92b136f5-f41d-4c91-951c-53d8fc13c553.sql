
DROP FUNCTION IF EXISTS public.search_exercises_by_name(text, text, integer);

CREATE FUNCTION public.search_exercises_by_name(p_query text, p_movement_pattern text DEFAULT NULL::text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, similarity real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT el.id, el.name, similarity(el.name, p_query) AS sim
  FROM exercises_library el
  WHERE (p_movement_pattern IS NULL OR el.movement_pattern = p_movement_pattern)
    AND similarity(el.name, p_query) > 0.15
  ORDER BY sim DESC
  LIMIT p_limit;
$$;
