-- Alterar coluna category para categories (array)
ALTER TABLE student_observations 
  ADD COLUMN categories text[];

-- Copiar dados existentes da coluna antiga para nova (array com 1 elemento)
UPDATE student_observations 
  SET categories = ARRAY[category]
  WHERE category IS NOT NULL;

-- Remover coluna antiga
ALTER TABLE student_observations 
  DROP COLUMN category;

-- Adicionar constraint para garantir que sempre há pelo menos 1 categoria
ALTER TABLE student_observations 
  ADD CONSTRAINT categories_not_empty 
  CHECK (array_length(categories, 1) > 0);