-- Add should_track column to prescription_exercises
ALTER TABLE prescription_exercises 
ADD COLUMN should_track boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN prescription_exercises.should_track IS 
'Indica se o exercício deve ter desempenho registrado nas sessões';