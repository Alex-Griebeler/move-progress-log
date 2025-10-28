-- Adicionar novos campos à tabela students para cadastro completo
ALTER TABLE public.students
ADD COLUMN birth_date date,
ADD COLUMN objectives text,
ADD COLUMN limitations text,
ADD COLUMN preferences text,
ADD COLUMN max_heart_rate integer,
ADD COLUMN injury_history text,
ADD COLUMN fitness_level text CHECK (fitness_level IN ('iniciante', 'intermediario', 'avancado'));