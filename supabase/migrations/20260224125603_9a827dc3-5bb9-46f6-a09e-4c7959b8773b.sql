
-- MEL-IA-001: Função calc_oura_baseline para baseline dinâmico por aluno
-- Retorna média de HRV, RHR e sleep_score dos últimos N dias
CREATE OR REPLACE FUNCTION public.calc_oura_baseline(
  p_student_id UUID,
  p_days INT DEFAULT 14
)
RETURNS TABLE(
  avg_hrv NUMERIC,
  avg_rhr NUMERIC,
  avg_sleep_score NUMERIC,
  data_points INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ROUND(AVG(om.average_sleep_hrv)::numeric, 1) AS avg_hrv,
    ROUND(AVG(om.resting_heart_rate)::numeric, 1) AS avg_rhr,
    ROUND(AVG(om.sleep_score)::numeric, 1) AS avg_sleep_score,
    COUNT(*)::int AS data_points
  FROM oura_metrics om
  WHERE om.student_id = p_student_id
    AND om.date >= (CURRENT_DATE - p_days)
    AND (om.average_sleep_hrv IS NOT NULL OR om.resting_heart_rate IS NOT NULL);
$$;
