-- Diagnóstico de sessões com horário legado possivelmente deslocado
-- Uso: cole no SQL Editor (Supabase/Lovable) e execute.
-- NÃO altera dados.

-- 1) Resumo por minuto de horário para identificar padrões suspeitos (ex.: :23 e :53)
SELECT
  to_char(time, 'MI') AS minute_bucket,
  COUNT(*) AS total_sessions
FROM public.workout_sessions
GROUP BY 1
ORDER BY 2 DESC;

-- 2) Sessões candidatas com simulação de horário corrigido (+03:07)
-- Ajuste a janela de created_at para o período de importação afetado.
WITH candidates AS (
  SELECT
    ws.id,
    ws.student_id,
    s.name AS student_name,
    ws.date,
    ws.time AS current_time,
    ws.created_at,
    ((time '00:00:00' + ws.time + interval '3 hours 7 minutes')::time) AS proposed_time
  FROM public.workout_sessions ws
  JOIN public.students s ON s.id = ws.student_id
  WHERE ws.created_at >= TIMESTAMPTZ '2026-04-01 00:00:00+00'
    AND ws.created_at <= TIMESTAMPTZ '2026-04-30 23:59:59+00'
    AND EXTRACT(MINUTE FROM ws.time)::int IN (23, 53)
)
SELECT
  c.*,
  EXISTS (
    SELECT 1
    FROM public.workout_sessions ws2
    WHERE ws2.student_id = c.student_id
      AND ws2.date = c.date
      AND ws2.time = c.proposed_time
      AND ws2.id <> c.id
  ) AS has_conflict
FROM candidates c
ORDER BY c.created_at DESC, c.student_name, c.date;

-- 3) Contagem de candidatos com/sem conflito
WITH candidates AS (
  SELECT
    ws.id,
    ws.student_id,
    ws.date,
    ws.time,
    ((time '00:00:00' + ws.time + interval '3 hours 7 minutes')::time) AS proposed_time
  FROM public.workout_sessions ws
  WHERE ws.created_at >= TIMESTAMPTZ '2026-04-01 00:00:00+00'
    AND ws.created_at <= TIMESTAMPTZ '2026-04-30 23:59:59+00'
    AND EXTRACT(MINUTE FROM ws.time)::int IN (23, 53)
), flagged AS (
  SELECT
    c.*,
    EXISTS (
      SELECT 1
      FROM public.workout_sessions ws2
      WHERE ws2.student_id = c.student_id
        AND ws2.date = c.date
        AND ws2.time = c.proposed_time
        AND ws2.id <> c.id
    ) AS has_conflict
  FROM candidates c
)
SELECT
  COUNT(*) AS total_candidates,
  COUNT(*) FILTER (WHERE has_conflict) AS with_conflict,
  COUNT(*) FILTER (WHERE NOT has_conflict) AS without_conflict
FROM flagged;
