
-- MEL-IA-003: Enable trigram similarity for semantic exercise search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to search exercises by name similarity within a functional group
CREATE OR REPLACE FUNCTION public.search_exercises_by_name(
  p_query TEXT,
  p_functional_group TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
) RETURNS TABLE(id UUID, name TEXT, similarity REAL)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public' AS $$
  SELECT el.id, el.name, similarity(el.name, p_query) AS sim
  FROM exercises_library el
  WHERE (p_functional_group IS NULL OR el.functional_group = p_functional_group)
    AND similarity(el.name, p_query) > 0.15
  ORDER BY sim DESC
  LIMIT p_limit;
$$;

-- GIN index for trigram similarity performance
CREATE INDEX IF NOT EXISTS idx_exercises_library_name_trgm 
  ON exercises_library USING gin (name gin_trgm_ops);
