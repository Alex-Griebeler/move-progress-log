-- Primeiro: deletar exercícios das sessões duplicadas
DELETE FROM exercises 
WHERE session_id IN (
  '79934a0a-c210-4b07-90e1-cf430c81cb09',
  'd63c9148-4ad7-4338-8f3f-5baf10d4dbd5'
);

-- Segundo: deletar as sessões duplicadas
DELETE FROM workout_sessions 
WHERE id IN (
  '79934a0a-c210-4b07-90e1-cf430c81cb09',
  'd63c9148-4ad7-4338-8f3f-5baf10d4dbd5'
);

-- Terceiro: adicionar constraint de unicidade para prevenir duplicatas futuras
CREATE UNIQUE INDEX idx_unique_student_session 
ON workout_sessions(student_id, date, time);