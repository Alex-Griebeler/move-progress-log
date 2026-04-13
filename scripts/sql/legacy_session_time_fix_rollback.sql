-- Rollback da última execução de correção de horário legado
-- Usa a tabela de auditoria workout_sessions_time_fix_audit

BEGIN;

WITH last_run AS (
  SELECT max(run_at) AS run_at
  FROM public.workout_sessions_time_fix_audit
),
rows_to_rollback AS (
  SELECT session_id, old_time
  FROM public.workout_sessions_time_fix_audit a
  JOIN last_run lr ON lr.run_at = a.run_at
)
UPDATE public.workout_sessions ws
SET
  time = r.old_time,
  updated_at = now()
FROM rows_to_rollback r
WHERE ws.id = r.session_id;

COMMIT;
