-- Adicionar colunas de peso e altura na tabela students
ALTER TABLE public.students 
ADD COLUMN weight_kg numeric,
ADD COLUMN height_cm numeric;