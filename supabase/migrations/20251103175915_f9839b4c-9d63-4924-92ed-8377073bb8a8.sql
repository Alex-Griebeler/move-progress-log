-- Create table for Oura sync logs
CREATE TABLE public.oura_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sync_date DATE NOT NULL,
  sync_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  metrics_synced JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oura_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for trainers to access sync logs of their students
CREATE POLICY "Trainers access own student sync logs"
ON public.oura_sync_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.students
    WHERE students.id = oura_sync_logs.student_id
    AND students.trainer_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_oura_sync_logs_student_date ON public.oura_sync_logs(student_id, sync_date DESC);
CREATE INDEX idx_oura_sync_logs_status ON public.oura_sync_logs(status, created_at DESC);