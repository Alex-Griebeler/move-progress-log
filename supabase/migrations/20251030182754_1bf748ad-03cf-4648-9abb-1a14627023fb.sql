
-- Remove a constraint que impede múltiplas atribuições da mesma prescrição
-- Isso permitirá atribuir a mesma prescrição para o mesmo aluno em diferentes dias da semana
ALTER TABLE public.prescription_assignments 
DROP CONSTRAINT IF EXISTS prescription_assignments_prescription_id_student_id_start_d_key;

-- Adiciona um índice para manter a performance nas consultas
CREATE INDEX IF NOT EXISTS idx_prescription_assignments_lookup 
ON public.prescription_assignments(prescription_id, student_id, start_date);
