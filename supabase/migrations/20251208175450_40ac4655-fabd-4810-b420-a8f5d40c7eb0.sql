-- =============================================
-- FABRIK ASSESSMENT - MIGRAÇÃO ADAPTADA
-- Adaptado para coexistir com Fabrik Performance
-- =============================================

-- 1. ENUMS (apenas os novos, sem conflito)
-- =============================================
DO $$ BEGIN
    CREATE TYPE assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fabrik_phase AS ENUM ('mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('none', 'mild', 'moderate', 'severe');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE laterality_type AS ENUM ('right', 'left', 'ambidextrous');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE test_type AS ENUM ('global', 'segmental');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELAS (renomeadas para evitar conflitos)
-- =============================================

-- Professional Students (relacionamento profissional-aluno para assessments)
CREATE TABLE IF NOT EXISTS public.professional_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  student_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(professional_id, student_id)
);

-- Assessments (avaliações)
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status assessment_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anamnesis Responses
CREATE TABLE IF NOT EXISTS public.anamnesis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  birth_date DATE,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  laterality laterality_type,
  occupation TEXT,
  work_type TEXT,
  pain_history JSONB DEFAULT '[]'::jsonb,
  surgeries JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '{}'::jsonb,
  has_red_flags BOOLEAN DEFAULT false,
  sedentary_hours_per_day NUMERIC,
  sleep_quality INTEGER,
  sleep_hours NUMERIC,
  activity_frequency INTEGER,
  activity_types JSONB DEFAULT '[]'::jsonb,
  activity_duration_minutes INTEGER,
  sports JSONB DEFAULT '[]'::jsonb,
  objectives TEXT,
  time_horizon TEXT,
  lgpd_consent BOOLEAN DEFAULT false,
  lgpd_consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global Test Results
CREATE TABLE IF NOT EXISTS public.global_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  anterior_view JSONB DEFAULT '{}'::jsonb,
  lateral_view JSONB DEFAULT '{}'::jsonb,
  posterior_view JSONB DEFAULT '{}'::jsonb,
  left_side JSONB DEFAULT '{}'::jsonb,
  right_side JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Segmental Test Results
CREATE TABLE IF NOT EXISTS public.segmental_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  body_region TEXT NOT NULL,
  left_value NUMERIC,
  right_value NUMERIC,
  cutoff_value NUMERIC,
  unit TEXT,
  pass_fail_left BOOLEAN,
  pass_fail_right BOOLEAN,
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Functional Findings
CREATE TABLE IF NOT EXISTS public.functional_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  body_region TEXT NOT NULL,
  classification_tag TEXT NOT NULL,
  severity severity_level NOT NULL DEFAULT 'mild',
  hypoactive_muscles JSONB DEFAULT '[]'::jsonb,
  hyperactive_muscles JSONB DEFAULT '[]'::jsonb,
  associated_injuries JSONB DEFAULT '[]'::jsonb,
  priority_score NUMERIC,
  context_weight INTEGER,
  biomechanical_importance INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment Exercises (renomeado para evitar conflito com exercises_library)
CREATE TABLE IF NOT EXISTS public.assessment_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  fabrik_phase fabrik_phase NOT NULL,
  body_region TEXT NOT NULL,
  target_muscles JSONB DEFAULT '[]'::jsonb,
  target_classifications JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  progression_criteria TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment Protocols (renomeado para evitar conflito com recovery_protocols)
CREATE TABLE IF NOT EXISTS public.assessment_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  name TEXT,
  priority_level priority_level NOT NULL DEFAULT 'medium',
  phase INTEGER DEFAULT 1,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  frequency_per_week INTEGER DEFAULT 3,
  duration_weeks INTEGER DEFAULT 4,
  completion_percentage NUMERIC DEFAULT 0,
  next_review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessment Progress Logs
CREATE TABLE IF NOT EXISTS public.assessment_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  protocol_id UUID NOT NULL REFERENCES public.assessment_protocols(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.assessment_exercises(id),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  difficulty_rating INTEGER,
  notes TEXT
);

-- 3. TRIGGERS PARA UPDATED_AT
-- =============================================
DROP TRIGGER IF EXISTS update_assessments_updated_at ON public.assessments;
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_anamnesis_responses_updated_at ON public.anamnesis_responses;
CREATE TRIGGER update_anamnesis_responses_updated_at
  BEFORE UPDATE ON public.anamnesis_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_test_results_updated_at ON public.global_test_results;
CREATE TRIGGER update_global_test_results_updated_at
  BEFORE UPDATE ON public.global_test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_segmental_test_results_updated_at ON public.segmental_test_results;
CREATE TRIGGER update_segmental_test_results_updated_at
  BEFORE UPDATE ON public.segmental_test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_exercises_updated_at ON public.assessment_exercises;
CREATE TRIGGER update_assessment_exercises_updated_at
  BEFORE UPDATE ON public.assessment_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_protocols_updated_at ON public.assessment_protocols;
CREATE TRIGGER update_assessment_protocols_updated_at
  BEFORE UPDATE ON public.assessment_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. HABILITAR RLS
-- =============================================
ALTER TABLE public.professional_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segmental_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.functional_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_progress_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES (usando app_role existente: admin, trainer, moderator)
-- Trainers podem criar/gerenciar assessments
-- =============================================

-- Professional Students (trainers podem gerenciar alunos)
CREATE POLICY "Trainers can view their students" ON public.professional_students
  FOR SELECT USING (
    auth.uid() = professional_id 
    OR auth.uid() = student_id 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Trainers can add students" ON public.professional_students
  FOR INSERT WITH CHECK (
    auth.uid() = professional_id 
    AND (has_role(auth.uid(), 'trainer') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Trainers can remove students" ON public.professional_students
  FOR DELETE USING (
    auth.uid() = professional_id 
    AND (has_role(auth.uid(), 'trainer') OR has_role(auth.uid(), 'admin'))
  );

-- Assessments
CREATE POLICY "Trainers can manage their assessments" ON public.assessments
  FOR ALL USING (
    auth.uid() = professional_id 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students can view their assessments" ON public.assessments
  FOR SELECT USING (auth.uid() = student_id);

-- Anamnesis (via assessment ownership)
CREATE POLICY "Access anamnesis via assessment" ON public.anamnesis_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = anamnesis_responses.assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Global Tests (via assessment ownership)
CREATE POLICY "Access global tests via assessment" ON public.global_test_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = global_test_results.assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Segmental Tests (via assessment ownership)
CREATE POLICY "Access segmental tests via assessment" ON public.segmental_test_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = segmental_test_results.assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Functional Findings (via assessment ownership)
CREATE POLICY "Access findings via assessment" ON public.functional_findings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = functional_findings.assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Assessment Exercises
CREATE POLICY "Authenticated users can read assessment exercises" ON public.assessment_exercises
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Trainers can manage assessment exercises" ON public.assessment_exercises
  FOR ALL USING (
    has_role(auth.uid(), 'trainer') 
    OR has_role(auth.uid(), 'admin')
  );

-- Assessment Protocols (via assessment ownership)
CREATE POLICY "Access protocols via assessment" ON public.assessment_protocols
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_protocols.assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Assessment Progress Logs
CREATE POLICY "Students can log their progress" ON public.assessment_progress_logs
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Trainers can view student progress" ON public.assessment_progress_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assessment_protocols p
      JOIN public.assessments a ON a.id = p.assessment_id
      WHERE p.id = assessment_progress_logs.protocol_id
      AND (a.professional_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- 6. INDEXES PARA PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_assessments_professional ON public.assessments(professional_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON public.assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
CREATE INDEX IF NOT EXISTS idx_professional_students_professional ON public.professional_students(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_students_student ON public.professional_students(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_exercises_phase ON public.assessment_exercises(fabrik_phase);
CREATE INDEX IF NOT EXISTS idx_assessment_exercises_region ON public.assessment_exercises(body_region);
CREATE INDEX IF NOT EXISTS idx_functional_findings_assessment ON public.functional_findings(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_protocols_assessment ON public.assessment_protocols(assessment_id);