-- Adiciona campo para agrupar exercícios manualmente
ALTER TABLE prescription_exercises 
ADD COLUMN group_with_previous boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN prescription_exercises.group_with_previous IS 'Indica se o exercício deve ser agrupado com o anterior na visualização';