-- Harden RLS on domain tables that were missing explicit policies.
-- Uses guarded dynamic SQL so migration is safe across environments
-- where some tables may not exist yet.

DO $$
BEGIN
  -- assessments
  IF to_regclass('public.assessments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "assessments_owner_or_admin" ON public.assessments';
    EXECUTE '
      CREATE POLICY "assessments_owner_or_admin"
      ON public.assessments
      FOR ALL
      USING (professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
      WITH CHECK (professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
    ';
  END IF;

  -- professional_students
  IF to_regclass('public.professional_students') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.professional_students ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "professional_students_owner_or_admin" ON public.professional_students';
    EXECUTE '
      CREATE POLICY "professional_students_owner_or_admin"
      ON public.professional_students
      FOR ALL
      USING (professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
      WITH CHECK (professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
    ';
  END IF;

  -- assessment_protocols
  IF to_regclass('public.assessment_protocols') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.assessment_protocols ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_protocols_owner_or_admin" ON public.assessment_protocols';
    EXECUTE '
      CREATE POLICY "assessment_protocols_owner_or_admin"
      ON public.assessment_protocols
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = assessment_protocols.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = assessment_protocols.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- anamnesis_responses
  IF to_regclass('public.anamnesis_responses') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "anamnesis_responses_owner_or_admin" ON public.anamnesis_responses';
    EXECUTE '
      CREATE POLICY "anamnesis_responses_owner_or_admin"
      ON public.anamnesis_responses
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = anamnesis_responses.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = anamnesis_responses.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- functional_findings
  IF to_regclass('public.functional_findings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.functional_findings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "functional_findings_owner_or_admin" ON public.functional_findings';
    EXECUTE '
      CREATE POLICY "functional_findings_owner_or_admin"
      ON public.functional_findings
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = functional_findings.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = functional_findings.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- global_test_results
  IF to_regclass('public.global_test_results') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.global_test_results ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "global_test_results_owner_or_admin" ON public.global_test_results';
    EXECUTE '
      CREATE POLICY "global_test_results_owner_or_admin"
      ON public.global_test_results
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = global_test_results.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = global_test_results.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- segmental_test_results
  IF to_regclass('public.segmental_test_results') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.segmental_test_results ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "segmental_test_results_owner_or_admin" ON public.segmental_test_results';
    EXECUTE '
      CREATE POLICY "segmental_test_results_owner_or_admin"
      ON public.segmental_test_results
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = segmental_test_results.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessments a
          WHERE a.id = segmental_test_results.assessment_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- assessment_progress_logs
  IF to_regclass('public.assessment_progress_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.assessment_progress_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_progress_logs_owner_or_admin" ON public.assessment_progress_logs';
    EXECUTE '
      CREATE POLICY "assessment_progress_logs_owner_or_admin"
      ON public.assessment_progress_logs
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.assessment_protocols ap
          JOIN public.assessments a ON a.id = ap.assessment_id
          WHERE ap.id = assessment_progress_logs.protocol_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.assessment_protocols ap
          JOIN public.assessments a ON a.id = ap.assessment_id
          WHERE ap.id = assessment_progress_logs.protocol_id
            AND (a.professional_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
        )
      )
    ';
  END IF;

  -- assessment_exercises (catalog): authenticated read, admin write
  IF to_regclass('public.assessment_exercises') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.assessment_exercises ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_exercises_read_authenticated" ON public.assessment_exercises';
    EXECUTE 'DROP POLICY IF EXISTS "assessment_exercises_manage_admin" ON public.assessment_exercises';
    EXECUTE '
      CREATE POLICY "assessment_exercises_read_authenticated"
      ON public.assessment_exercises
      FOR SELECT
      USING (auth.uid() IS NOT NULL)
    ';
    EXECUTE '
      CREATE POLICY "assessment_exercises_manage_admin"
      ON public.assessment_exercises
      FOR ALL
      USING (public.has_role(auth.uid(), ''admin''))
      WITH CHECK (public.has_role(auth.uid(), ''admin''))
    ';
  END IF;

  -- breathing_protocols (catalog): authenticated read, admin write
  IF to_regclass('public.breathing_protocols') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.breathing_protocols ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "breathing_protocols_read_authenticated" ON public.breathing_protocols';
    EXECUTE 'DROP POLICY IF EXISTS "breathing_protocols_manage_admin" ON public.breathing_protocols';
    EXECUTE '
      CREATE POLICY "breathing_protocols_read_authenticated"
      ON public.breathing_protocols
      FOR SELECT
      USING (auth.uid() IS NOT NULL)
    ';
    EXECUTE '
      CREATE POLICY "breathing_protocols_manage_admin"
      ON public.breathing_protocols
      FOR ALL
      USING (public.has_role(auth.uid(), ''admin''))
      WITH CHECK (public.has_role(auth.uid(), ''admin''))
    ';
  END IF;

  -- equipment_inventory (catalog): authenticated read, admin write
  IF to_regclass('public.equipment_inventory') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "equipment_inventory_read_authenticated" ON public.equipment_inventory';
    EXECUTE 'DROP POLICY IF EXISTS "equipment_inventory_manage_admin" ON public.equipment_inventory';
    EXECUTE '
      CREATE POLICY "equipment_inventory_read_authenticated"
      ON public.equipment_inventory
      FOR SELECT
      USING (auth.uid() IS NOT NULL)
    ';
    EXECUTE '
      CREATE POLICY "equipment_inventory_manage_admin"
      ON public.equipment_inventory
      FOR ALL
      USING (public.has_role(auth.uid(), ''admin''))
      WITH CHECK (public.has_role(auth.uid(), ''admin''))
    ';
  END IF;

  -- session_templates
  IF to_regclass('public.session_templates') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "session_templates_owner_or_admin" ON public.session_templates';
    EXECUTE '
      CREATE POLICY "session_templates_owner_or_admin"
      ON public.session_templates
      FOR ALL
      USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
      WITH CHECK (trainer_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))
    ';
  END IF;
END $$;
