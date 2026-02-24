
-- MEL-IA-007: Protocol effectiveness tracking
CREATE TABLE public.protocol_adherence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.recovery_protocols(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.protocol_recommendations(id) ON DELETE SET NULL,
  followed BOOLEAN NOT NULL DEFAULT false,
  followed_at TIMESTAMP WITH TIME ZONE,
  hrv_before NUMERIC,
  hrv_after NUMERIC,
  hrv_delta NUMERIC,
  readiness_before INTEGER,
  readiness_after INTEGER,
  readiness_delta INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: trainers access via student ownership
ALTER TABLE public.protocol_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers access own student adherence"
  ON public.protocol_adherence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = protocol_adherence.student_id
        AND students.trainer_id = auth.uid()
    )
  );

-- Index for efficient lookups
CREATE INDEX idx_protocol_adherence_student_protocol 
  ON public.protocol_adherence(student_id, protocol_id);
CREATE INDEX idx_protocol_adherence_created 
  ON public.protocol_adherence(created_at DESC);
