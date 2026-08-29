-- R7 (auditoria 29/08): calc_oura_baseline furava a RLS trainer-scoped
-- (SECURITY DEFINER só com assert_staff) e ancorava a janela em
-- CURRENT_DATE incluindo o próprio dia e linhas futuras. A v1 ganha
-- ownership + teto mantendo o SHAPE (app publicado continua funcionando);
-- a v2 ancora no dia avaliado e conta POR MÉTRICA.
-- Idempotente (CREATE OR REPLACE). Já aplicada em produção em 2026-08-29.

CREATE OR REPLACE FUNCTION public.calc_oura_baseline(p_student_id uuid, p_days integer DEFAULT 14)
RETURNS TABLE(avg_hrv numeric, avg_rhr numeric, avg_sleep_score numeric, data_points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_staff();
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id
      AND (s.trainer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'not authorized for this student';
  END IF;
  RETURN QUERY
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1),
    ROUND(AVG(om.resting_heart_rate)::numeric, 1),
    ROUND(AVG(om.sleep_score)::numeric, 1),
    COUNT(*)::int
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (CURRENT_DATE - p_days)
    AND om.date <= CURRENT_DATE
    AND (om.average_sleep_hrv IS NOT NULL OR om.resting_heart_rate IS NOT NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calc_oura_baseline_v2(p_student_id uuid, p_days integer DEFAULT 30, p_as_of date DEFAULT CURRENT_DATE)
RETURNS TABLE(avg_hrv numeric, avg_rhr numeric, avg_sleep_score numeric, hrv_points integer, rhr_points integer, sleep_points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_staff();
  IF NOT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id
      AND (s.trainer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ) THEN
    RAISE EXCEPTION 'not authorized for this student';
  END IF;
  RETURN QUERY
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1),
    ROUND(AVG(om.resting_heart_rate)::numeric, 1),
    ROUND(AVG(om.sleep_score)::numeric, 1),
    COUNT(om.average_sleep_hrv)::int,
    COUNT(om.resting_heart_rate)::int,
    COUNT(om.sleep_score)::int
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (p_as_of - p_days)
    AND om.date < p_as_of;
END;
$function$;

-- Função nova herda EXECUTE de PUBLIC por default — revogar só de anon não
-- remove o privilégio herdado (Codex R7).
REVOKE EXECUTE ON FUNCTION public.calc_oura_baseline(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calc_oura_baseline_v2(uuid, integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_oura_baseline(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_oura_baseline_v2(uuid, integer, date) TO authenticated;
