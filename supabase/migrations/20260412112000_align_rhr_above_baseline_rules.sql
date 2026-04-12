-- Align resting heart rate baseline rules with training recommendation engine.
-- Expected behavior:
-- +5 bpm above baseline => medium severity warning
-- +10 bpm above baseline => high severity critical

INSERT INTO public.adaptation_rules (
  metric_name,
  condition,
  threshold_value,
  action_type,
  severity,
  description
)
SELECT
  'resting_heart_rate',
  'above_baseline',
  5,
  'monitor_stress',
  'medium',
  'FC de repouso acima do baseline (+5 bpm): monitorar estresse e considerar ajuste de carga.'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.adaptation_rules
  WHERE metric_name = 'resting_heart_rate'
    AND condition = 'above_baseline'
    AND threshold_value = 5
    AND action_type = 'monitor_stress'
);

INSERT INTO public.adaptation_rules (
  metric_name,
  condition,
  threshold_value,
  action_type,
  severity,
  description
)
SELECT
  'resting_heart_rate',
  'above_baseline',
  10,
  'monitor_stress',
  'high',
  'FC de repouso muito acima do baseline (+10 bpm): priorizar recuperação e evitar carga intensa.'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.adaptation_rules
  WHERE metric_name = 'resting_heart_rate'
    AND condition = 'above_baseline'
    AND threshold_value = 10
    AND action_type = 'monitor_stress'
);

UPDATE public.adaptation_rules
SET
  severity = 'medium',
  description = 'FC de repouso acima do baseline (+5 bpm): monitorar estresse e considerar ajuste de carga.'
WHERE metric_name = 'resting_heart_rate'
  AND condition = 'above_baseline'
  AND threshold_value = 5
  AND action_type = 'monitor_stress';

UPDATE public.adaptation_rules
SET
  severity = 'high',
  description = 'FC de repouso muito acima do baseline (+10 bpm): priorizar recuperação e evitar carga intensa.'
WHERE metric_name = 'resting_heart_rate'
  AND condition = 'above_baseline'
  AND threshold_value = 10
  AND action_type = 'monitor_stress';

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY metric_name, condition, threshold_value, action_type
      ORDER BY created_at, id
    ) AS rn
  FROM public.adaptation_rules
  WHERE metric_name = 'resting_heart_rate'
    AND condition = 'above_baseline'
    AND threshold_value IN (5, 10)
    AND action_type = 'monitor_stress'
)
DELETE FROM public.adaptation_rules ar
USING ranked
WHERE ar.id = ranked.id
  AND ranked.rn > 1;
