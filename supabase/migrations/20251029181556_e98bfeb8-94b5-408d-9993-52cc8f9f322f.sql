-- Adicionar prescription_id às sessões para vincular à prescrição
ALTER TABLE workout_sessions 
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES workout_prescriptions(id);

-- Adicionar is_best_set aos exercícios para marcar série de maior carga
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS is_best_set BOOLEAN DEFAULT false;

-- Adicionar sets aos exercícios (verificar se já existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='exercises' AND column_name='sets') THEN
    ALTER TABLE exercises ADD COLUMN sets INTEGER;
  END IF;
END $$;