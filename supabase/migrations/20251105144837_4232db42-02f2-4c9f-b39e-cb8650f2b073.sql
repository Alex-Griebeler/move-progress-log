-- Adicionar campos à tabela workout_sessions para treinos e contexto
ALTER TABLE workout_sessions 
ADD COLUMN workout_name TEXT,
ADD COLUMN room_name TEXT,
ADD COLUMN trainer_name TEXT,
ADD COLUMN is_finalized BOOLEAN DEFAULT false,
ADD COLUMN can_reopen BOOLEAN DEFAULT true;

-- Criar índices para melhor performance
CREATE INDEX idx_workout_sessions_finalized ON workout_sessions(is_finalized);
CREATE INDEX idx_workout_sessions_workout_name ON workout_sessions(workout_name);

-- Nova tabela para segmentos de áudio com transcrições editáveis
CREATE TABLE session_audio_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  segment_order INTEGER NOT NULL,
  raw_transcription TEXT NOT NULL,
  edited_transcription TEXT,
  audio_duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_session 
    FOREIGN KEY (session_id) 
    REFERENCES workout_sessions(id) 
    ON DELETE CASCADE
);

-- Índices para session_audio_segments
CREATE INDEX idx_audio_segments_session ON session_audio_segments(session_id);
CREATE INDEX idx_audio_segments_order ON session_audio_segments(session_id, segment_order);

-- RLS policies para session_audio_segments
ALTER TABLE session_audio_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers access own student audio segments"
ON session_audio_segments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    JOIN students s ON s.id = ws.student_id
    WHERE ws.id = session_audio_segments.session_id
    AND s.trainer_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at em session_audio_segments
CREATE TRIGGER update_session_audio_segments_updated_at
BEFORE UPDATE ON session_audio_segments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON COLUMN workout_sessions.workout_name IS 'Nome do treino: Back to Basics, HIIT, Mind';
COMMENT ON COLUMN workout_sessions.room_name IS 'Sala da Fabrik onde o treino foi realizado';
COMMENT ON COLUMN workout_sessions.trainer_name IS 'Nome do treinador que ministrou o treino';
COMMENT ON COLUMN workout_sessions.is_finalized IS 'Indica se a sessão foi finalizada';
COMMENT ON COLUMN workout_sessions.can_reopen IS 'Permite reabrir a sessão para edição';

COMMENT ON TABLE session_audio_segments IS 'Armazena segmentos de áudio transcritos de uma sessão de treino';
COMMENT ON COLUMN session_audio_segments.raw_transcription IS 'Transcrição original gerada pela IA';
COMMENT ON COLUMN session_audio_segments.edited_transcription IS 'Transcrição editada manualmente pelo treinador (salva automaticamente)';