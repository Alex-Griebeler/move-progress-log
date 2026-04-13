-- Correção segura de horários legados (aplica update só sem conflito)
-- Uso recomendado:
-- 1) Rodar primeiro: scripts/sql/legacy_session_time_diagnostic.sql
-- 2) Confirmar candidatos
-- 3) Rodar este script
--
-- ESTE SCRIPT ALTERA DADOS.

BEGIN;

-- 1) Snapshot de auditoria antes da atualização
CREATE TABLE IF NOT EXISTS public.workout_sessions_time_fix_audit (
  run_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  date date NOT NULL,
  old_time time NOT NULL,
  new_time time NOT NULL,
  created_at timestamptz NULL
);

-- 2) Seleciona candidatos (mesma regra do diagnóstico)
WITH candidates AS (
  SELECT
    ws.id,
    ws.student_id,
    ws.date,
    ws.time AS old_time,
    ws.created_at,
    ((time '00:00:00' + ws.time + interval '3 hours 7 minutes')::time) AS new_time
  FROM public.workout_sessions ws
  WHERE ws.created_at >= TIMESTAMPTZ '2026-04-01 00:00:00+00'
    AND ws.created_at <= TIMESTAMPTZ '2026-04-30 23:59:59+00'
    AND EXTRACT(MINUTE FROM ws.time)::int IN (23, 53)
),
non_conflicting AS (
  SELECT c.*
  FROM candidates c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workout_sessions ws2
    WHERE ws2.student_id = c.student_id
      AND ws2.date = c.date
      AND ws2.time = c.new_time
      AND ws2.id <> c.id
  )
),
audit_insert AS (
  INSERT INTO public.workout_sessions_time_fix_audit (
    session_id,
    student_id,
    date,
    old_time,
    new_time,
    created_at
  )
  SELECT
    id,
    student_id,
    date,
    old_time,
    new_time,
    created_at
  FROM non_conflicting
  RETURNING session_id
)
UPDATE public.workout_sessions ws
SET
  time = n.new_time,
  updated_at = now()
FROM non_conflicting n
WHERE ws.id = n.id;

-- 3) Resumo da execução
WITH last_run AS (
  SELECT max(run_at) AS run_at
  FROM public.workout_sessions_time_fix_audit
)
SELECT
  a.run_at,
  COUNT(*) AS rows_updated,
  MIN(a.old_time) AS min_old_time,
  MAX(a.old_time) AS max_old_time,
  MIN(a.new_time) AS min_new_time,
  MAX(a.new_time) AS max_new_time
FROM public.workout_sessions_time_fix_audit a
JOIN last_run lr ON lr.run_at = a.run_at
GROUP BY a.run_at;

COMMIT;
