-- Função para normalizar objetivos
CREATE OR REPLACE FUNCTION normalize_objective(obj TEXT) 
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Adicionar coluna temporária
ALTER TABLE students ADD COLUMN objectives_new TEXT[];

-- Converter dados existentes
UPDATE students SET objectives_new = (
  SELECT ARRAY(
    SELECT DISTINCT normalized 
    FROM (
      SELECT normalize_objective(TRIM(unnest(string_to_array(objectives, '/')))) AS normalized
    ) sub
    WHERE normalized IS NOT NULL
    LIMIT 2
  )
)
WHERE objectives IS NOT NULL AND objectives != '';

-- Remover coluna antiga e renomear nova
ALTER TABLE students DROP COLUMN objectives;
ALTER TABLE students RENAME COLUMN objectives_new TO objectives;