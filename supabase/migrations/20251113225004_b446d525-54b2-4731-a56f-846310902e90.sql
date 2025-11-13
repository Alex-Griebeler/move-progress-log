-- Create student_reports table
CREATE TABLE public.student_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('mensal', 'bimestral', 'trimestral', 'personalizado')),
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  
  -- Calculated metrics
  total_sessions INTEGER NOT NULL DEFAULT 0,
  weekly_average NUMERIC(5,2),
  adherence_percentage NUMERIC(5,2),
  sessions_proposed INTEGER,
  
  -- Trainer summary
  trainer_highlights TEXT,
  attention_points TEXT,
  next_cycle_plan TEXT,
  
  -- Oura data (when available)
  oura_data JSONB,
  
  -- AI generated insights
  consistency_analysis TEXT,
  strength_analysis TEXT,
  
  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_tracked_exercises table
CREATE TABLE public.report_tracked_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.student_reports(id) ON DELETE CASCADE,
  exercise_library_id UUID REFERENCES public.exercises_library(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  
  -- Evolution metrics
  initial_load NUMERIC(10,2),
  final_load NUMERIC(10,2),
  load_variation_percentage NUMERIC(6,2),
  initial_total_work NUMERIC(10,2),
  final_total_work NUMERIC(10,2),
  work_variation_percentage NUMERIC(6,2),
  
  -- Weekly progression data for charts
  weekly_progression JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_tracked_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_reports
CREATE POLICY "Trainers manage own student reports"
  ON public.student_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_reports.student_id
      AND students.trainer_id = auth.uid()
    )
  );

-- RLS Policies for report_tracked_exercises
CREATE POLICY "Access via report ownership"
  ON public.report_tracked_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.student_reports sr
      JOIN public.students s ON s.id = sr.student_id
      WHERE sr.id = report_tracked_exercises.report_id
      AND s.trainer_id = auth.uid()
    )
  );

-- Trigger for updating updated_at
CREATE TRIGGER update_student_reports_updated_at
  BEFORE UPDATE ON public.student_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_student_reports_student_id ON public.student_reports(student_id);
CREATE INDEX idx_student_reports_period ON public.student_reports(period_start, period_end);
CREATE INDEX idx_report_tracked_exercises_report_id ON public.report_tracked_exercises(report_id);