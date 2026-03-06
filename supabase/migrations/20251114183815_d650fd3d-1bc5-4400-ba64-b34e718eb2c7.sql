-- Corrigir search_path da função normalize_objective
CREATE OR REPLACE FUNCTION normalize_objective(obj TEXT) 
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Converter para lowercase e remover espaços
  obj := LOWER(TRIM(obj));
  
  -- Mapear variações para valores padrão
  CASE 
    WHEN obj IN ('hipertrofia', 'ganho de massa') THEN RETURN 'hipertrofia';
    WHEN obj IN ('emagrecimento', 'perda de peso', 'emagrecer') THEN RETURN 'emagrecimento';
    WHEN obj IN ('recondicionamento', 'recondicionamento de lesão', 'recondicionamento de lesao', 'reabilitação', 'reabilitacao') THEN RETURN 'recondicionamento_lesao';
    WHEN obj IN ('saúde', 'saude', 'longevidade', 'saúde e longevidade', 'saude e longevidade') THEN RETURN 'saude_longevidade';
    WHEN obj IN ('condicionamento', 'condicionamento físico', 'condicionamento fisico', 'fitness') THEN RETURN 'condicionamento_fisico';
    WHEN obj IN ('performance', 'performance esportiva', 'esporte') THEN RETURN 'performance_esportiva';
    ELSE RETURN NULL;
  END CASE;
END;
$$;